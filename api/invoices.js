/* global Buffer */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {getAdminClient} from './_lib/supabaseClient.js';
import {getUserFromRequest,getActiveEntitlement} from './_lib/entitlements.js';
import {getCorsHeaders} from './_lib/common.js';
import {validateModel,TEMPLATES} from '../src/lib/invoices/model.js';
import {generateUpgradedPDF} from '../src/lib/invoices/pdf.js';
import {invoiceTier,INVOICE_CAPABILITIES} from '../src/lib/invoices/tiers.js';
const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v||'');
const fonts=async()=>({regular:await readFile(new URL('../src/assets/invoice-fonts/inter-regular.woff',import.meta.url)),bold:await readFile(new URL('../src/assets/invoice-fonts/inter-bold.woff',import.meta.url))});
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value;
export const invoiceFingerprint=invoice=>createHash('sha256').update(JSON.stringify(stable({...invoice,template:undefined}))).digest('hex');
async function body(req){if(req.body){const value=typeof req.body==='string'?JSON.parse(req.body):req.body;if(JSON.stringify(value).length>2000000)throw new Error('Invoice request exceeds 2 MB.');return value;}let size=0;const chunks=[];for await(const part of req){size+=part.length;if(size>2000000)throw new Error('Invoice request exceeds 2 MB.');chunks.push(part);}return JSON.parse(Buffer.concat(chunks).toString());}
export function createInvoiceHandler({adminClient=getAdminClient,identify=getUserFromRequest,generate=generateUpgradedPDF,loadFonts=fonts}={}){return async(req,res)=>{
 const headers={...getCorsHeaders(req.headers?.origin),'Cache-Control':'private, no-store','Content-Type':'application/json'};
 const send=(status,data)=>{res.writeHead(status,headers);res.end(JSON.stringify(data));};
 if(req.method==='OPTIONS'){res.writeHead(204,headers);res.end();return;}
 if(!['GET','POST'].includes(req.method))return send(405,{error:'Method not allowed'});
 const admin=adminClient();if(!admin)return send(503,{error:'Invoice account storage is unavailable. Your local draft is unchanged.'});
 const user=await identify(req,admin);if(!user)return send(401,{error:'Sign in to finalize, save defaults or view invoice history.'});
 try{
  const url=new URL(req.url,'https://orbitboard.in');
  if(req.method==='GET'){
   if(url.searchParams.has('id')){
    const id=url.searchParams.get('id');if(!uuid(id))return send(400,{error:'Invalid invoice identifier.'});
    const {data:row,error}=await admin.from('invoice_snapshots').select('*').eq('user_id',user.id).eq('id',id).maybeSingle();if(error)throw error;if(!row)return send(404,{error:'Invoice not found.'});
    if(url.searchParams.get('download')==='1'){
     const template=url.searchParams.get('template');if(template&&!TEMPLATES.some(t=>t.id===template))return send(400,{error:'Unknown template.'});
     const bytes=template&&template!==row.snapshot.template?Buffer.from(await(await generate(row.snapshot,{fonts:await loadFonts(),template})).arrayBuffer()):Buffer.from(row.pdf_base64,'base64');
     if(bytes.byteLength>3*1024*1024)return send(422,{error:'This template exceeds the 3 MB PDF limit. Download the saved original or use a compact template.'});
     const {error:auditError}=await admin.from('invoice_audit').insert({invoice_id:row.id,user_id:user.id,event:'downloaded'});if(auditError)throw auditError;
     res.writeHead(200,{...headers,'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="orbitboard-invoice-${row.id}.pdf"`});res.end(bytes);return;
    }
    return send(200,{id:row.id,snapshot:row.snapshot,createdAt:row.created_at});
   }
   const offset=Number(url.searchParams.get('offset')||0);if(!Number.isSafeInteger(offset)||offset<0||offset>1000000)return send(400,{error:'Invalid history page.'});
   const search=String(url.searchParams.get('q')||'').slice(0,80).replace(/[\\%_]/g,'');
   let history=admin.from('invoice_snapshots').select('id,invoice_number,invoice_type,created_at').eq('user_id',user.id);if(search)history=history.ilike('invoice_number',`%${search}%`);
   const {data:invoices,error}=await history.order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+50);if(error)throw error;
   const {data:preferences,error:prefError}=await admin.from('invoice_preferences').select('invoice_type,template').eq('user_id',user.id);if(prefError)throw prefError;
   const sub=await getActiveEntitlement(admin,user.id);const tier=invoiceTier(sub?.status==='active'?sub.plan_code:null);
   const {data:policy,error:policyError}=await admin.from('invoice_policy').select('*').eq('tier',tier).single();if(policyError)throw policyError;
   const period=policy.reset_policy==='monthly'?new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit'}).format(new Date()).slice(0,7):'lifetime';
   const {data:usage,error:usageError}=await admin.from('invoice_usage').select('used').eq('user_id',user.id).eq('period',period).maybeSingle();if(usageError)throw usageError;
   return send(200,{invoices:invoices.slice(0,50),hasMore:invoices.length>50,preferences,tier,policy,used:usage?.used||0,capabilities:INVOICE_CAPABILITIES,checkoutAvailable:false});
  }
  const input=await body(req);
  if(input.action==='preference'){
   if(!['b2b','b2c','export'].includes(input.type)||!TEMPLATES.some(t=>t.id===input.template))return send(400,{error:'Invalid template preference.'});
   const {error}=await admin.from('invoice_preferences').upsert({user_id:user.id,invoice_type:input.type,template:input.template,updated_at:new Date().toISOString()},{onConflict:'user_id,invoice_type'});if(error)throw error;return send(200,{saved:true});
  }
  if(input.action!=='finalize'||!uuid(input.requestId)||input.invoice?.schemaVersion!==2)return send(400,{error:'Invalid invoice finalization request.'});
  input.invoice.seller.gstin=String(input.invoice.seller.gstin||'').trim().toUpperCase();
  input.invoice.buyer.gstin=String(input.invoice.buyer.gstin||'').trim().toUpperCase();
  const validation=validateModel(input.invoice);if(validation.errors.length)return send(422,{error:'Review invoice particulars.',errors:validation.errors});
  const fingerprint=invoiceFingerprint(input.invoice);
  const {data:existing,error:readError}=await admin.from('invoice_snapshots').select('id,fingerprint').eq('user_id',user.id).eq('request_id',input.requestId).maybeSingle();if(readError)throw readError;
  if(existing){if(existing.fingerprint!==fingerprint)return send(409,{error:'This draft was finalized with different particulars. Create a new invoice; the saved original is unchanged.'});return send(200,{id:existing.id,alreadyFinalized:true});}
  const blob=await generate(input.invoice,{fonts:await loadFonts()});if(blob.size>3*1024*1024)return send(422,{error:'Generated invoice exceeds 3 MB. Reduce logo/attachments or line descriptions.'});const pdf=Buffer.from(await blob.arrayBuffer()).toString('base64');
  const {data,error}=await admin.rpc('finalize_invoice',{p_user:user.id,p_request:input.requestId,p_fingerprint:fingerprint,p_snapshot:input.invoice,p_pdf:pdf});if(error)throw error;
  return send(200,{id:data.id,alreadyFinalized:false});
 }catch(error){const message=String(error.message||'');if(message.includes('invoice_allowance_exhausted'))return send(402,{error:'Your five-invoice launch allowance is used. A paid entitlement is required for another finalization. Invoice checkout is not active; contact support@orbitboard.in. Existing invoices remain downloadable.'});if(error.code==='23505'||message.includes('Idempotency conflict'))return send(409,{error:'This invoice number or request already exists. The original snapshot was preserved; use a new draft and number.'});return send(400,{error:'Invoice operation could not complete. Check inputs or retry. Your draft and existing invoices are unchanged.'});}
};}
export default createInvoiceHandler();
