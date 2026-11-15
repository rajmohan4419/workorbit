import geo from 'countrycitystatejson/countries';
import postal from 'postal-codes-js';
import { GST_STATE_CODES, validateGstin } from './gstIdentity.js';
import { strictDate } from '../../engines/financeValidation.js';
export const TEMPLATES = [
 {id:'modern',name:'Modern Business',description:'Open spacing, violet accents',accent:[.32,.22,.60],fontSize:9,gap:14},
 {id:'ledger',name:'Classic Ledger',description:'Ruled sections and balanced columns',accent:[.20,.24,.28],fontSize:9,gap:14},
 {id:'compact',name:'Compact Professional',description:'Dense, grayscale-friendly details',accent:[.18,.18,.18],fontSize:8,gap:11},
 {id:'commercial',name:'Commercial Export',description:'Seller, sold-to and delivery terms',accent:[.22,.29,.34],fontSize:9,gap:14},
 {id:'shipping',name:'Detailed Shipping',description:'Packaging, transport and importer detail',accent:[.25,.31,.28],fontSize:9,gap:12},
];
export const CURRENCIES={INR:['Rupees','Paise'],USD:['US Dollars','Cents'],EUR:['Euros','Cents'],GBP:['Pounds','Pence'],AED:['Dirhams','Fils'],AUD:['Australian Dollars','Cents'],CAD:['Canadian Dollars','Cents'],SGD:['Singapore Dollars','Cents']};
export const RULES={verifiedOn:'2026-11-15',eInvoiceThresholdInr:50000000,eInvoiceEffectiveFrom:'2023-08-01',reportingThresholdInr:100000000,reportingDays:30,reportingEffectiveFrom:'2025-04-01',rule46:'https://cbic-gst.gov.in/pdf/amended-01012022-CGST-Rules-2017-Part-A.pdf',hsn:'https://gstcouncil.gov.in/sites/default/files/2024-05/notfctn-78-central-tax-english-2020.pdf',einvoice:'https://einvoice6.gst.gov.in/content/notifications/',exportEligibility:'https://delhicustoms.gov.in/files/air-cargo-export/PN_27_2023.pdf'};
// Exact wording of Rule 46 as amended by 17/2017-CT. The combined statutory
// wording does not enable SEZ supplies in this product.
export const ENDORSEMENTS={lut:'SUPPLY MEANT FOR EXPORT/SUPPLY TO SEZ UNIT OR SEZ DEVELOPER FOR AUTHORISED OPERATIONS UNDER BOND OR LETTER OF UNDERTAKING WITHOUT PAYMENT OF INTEGRATED TAX',igst:'SUPPLY MEANT FOR EXPORT/SUPPLY TO SEZ UNIT OR SEZ DEVELOPER FOR AUTHORISED OPERATIONS ON PAYMENT OF INTEGRATED TAX'};
export const UTGST_STATES=new Set(['Chandigarh','Dadra & Nagar Haveli','Lakshadweep','Andaman & Nicobar Islands','Ladakh','Dadra and Nagar Haveli and Daman and Diu']);
const text=v=>String(v??'').trim();
export function decimal(value,scale=6){
 const str=text(value);if(str.length>24)throw new Error('Decimal value exceeds the supported size.');if(!/^\d+(?:\.\d+)?$/.test(str)||str.split('.')[1]?.length>scale)throw new Error(`Use a non-negative decimal with at most ${scale} places.`);
 const [whole,fraction='']=str.split('.');return BigInt(whole)*10n**BigInt(scale)+BigInt(fraction.padEnd(scale,'0'));
}
const divRound=(a,b)=>(a+b/2n)/b;
const output=n=>{if(n>900000000000000n||n< -900000000000000n)throw new Error('Invoice exceeds the supported money limit.');return Number(n)/100;};
export function invoiceYear(date){return Number(date.slice(5,7))<4?Number(date.slice(0,4))-1:Number(date.slice(0,4));}
export function invoiceLine(item,invoice){
 const gross=divRound(decimal(item.qty)*decimal(item.rate),10000000000n);
 const discount=divRound(gross*decimal(item.discount||0,2),10000n);
 const taxable=gross-discount;
 const exporting=invoice.type==='export',zero=exporting&&invoice.export?.treatment==='lut';
 const interstate=exporting||invoice.seller.state!==invoice.meta.placeOfSupply;
 const gst=zero?0n:decimal(item.gstRate,2),cessRate=zero?0n:decimal(item.cessRate||0,2);
 const igst=interstate?divRound(taxable*gst,10000n):0n;
 const cgst=interstate?0n:divRound(taxable*gst,20000n),sgst=cgst;
 const cess=divRound(taxable*cessRate,10000n);
 return Object.fromEntries(Object.entries({gross,discount,taxable,igst,cgst,sgst,cess,total:taxable+igst+cgst+sgst+cess}).map(([k,v])=>[k,output(v)]));
}
export function invoiceTotals(invoice){
 const lines=invoice.items.map(i=>invoiceLine(i,invoice));
 const cents=v=>decimal(Number(v).toFixed(2),2);
 const totals=Object.fromEntries(['gross','discount','taxable','igst','cgst','sgst','cess','total'].map(key=>[key,output(lines.reduce((sum,line)=>sum+cents(line[key]),0n))]));
 const unrounded=cents(totals.total),rounded=invoice.currency==='INR'?divRound(unrounded,100n)*100n:unrounded;
 const paid=decimal(invoice.paid||0,2);
 return {...totals,lines,roundOff:Number(rounded-unrounded)/100,total:output(rounded),paid:output(paid),balance:Number(rounded-paid)/100,
   inr:invoice.currency==='INR'?null:Object.fromEntries(['taxable','igst','cess','total'].map(key=>[key,output(divRound(cents(totals[key])*decimal(invoice.export?.inrRate||0),1000000n))]))};
}
export function partyLines(p={},seller=false){
 return [seller?p.companyName:p.name,p.address,p.address2,[p.city,p.country==='IN'&&GST_STATE_CODES[p.state]?`${p.state} (${GST_STATE_CODES[p.state]})`:p.state,p.pin].filter(text).join(', '),geo.getCountryInfoByShort(p.country)?.name || p.country,[p.phone,p.email].filter(text).join(' | '),p.country==='IN'&&p.gstin?`GSTIN: ${p.gstin}`:'',p.taxId?`Tax ID / VAT: ${p.taxId}`:'',seller&&p.pan?`PAN: ${p.pan}`:''].filter(text);
}
export function renderingErrors(invoice){
 const errors=[];
 for(const object of [invoice.seller,invoice.buyer,invoice.meta,invoice.export,invoice.shipping,invoice.shipping?.address,invoice.export?.importer])for(const [key,value]of Object.entries(object||{}))if(typeof value==='string'&&!/logo|signatureImage/.test(key)&&value.length>2000)errors.push(`${key} exceeds 2,000 characters.`);
 if(text(invoice.signatory).length>160)errors.push('Signatory name exceeds 160 characters.');
 if(text(invoice.notes).length>10000)errors.push('Notes exceed 10,000 characters.');
 if(!Array.isArray(invoice.items)||invoice.items.length<1||invoice.items.length>200)errors.push('Use between 1 and 200 line items.');
 if((invoice.items||[]).some(item=>text(item.description).length>6000))errors.push('A line description exceeds 6,000 characters.');
 if((invoice.items||[]).reduce((n,item)=>n+text(item.description).length,0)>40000)errors.push('Item descriptions exceed 40,000 characters combined. Split the invoice.');
 return errors;
}
export function validateModel(invoice){
 const errors=renderingErrors(invoice),warnings=[];const {seller={},buyer={},meta={},items=[],export:exp={},shipping={}}=invoice;
 if(!TEMPLATES.some(t=>t.id===invoice.template))errors.push('Select a supported template.');
 const required=(v,label)=>{if(!text(v))errors.push(`${label} is required.`);};
 const party=(p,label,india=true)=>{
  required(p.address,`${label} address line 1`);required(p.city,`${label} city`);required(p.country,`${label} country`);if(!geo.getCountryInfoByShort(p.country))errors.push(`${label} country must be selected from the list.`);
  if(india){if(p.country!=='IN')errors.push(`${label} country must be India.`);if(!GST_STATE_CODES[p.state]||p.state==='Daman & Diu')errors.push(`${label} state/UT must be selected.`);if(!/^[1-9]\d{5}$/.test(text(p.pin)))errors.push(`${label} PIN must be six digits and not start with zero.`);}
  else if(text(p.pin)){const valid=postal.validate(p.country,p.pin);if(valid!==true)errors.push(`${label} postal code: ${valid}`);}
  if(p.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))errors.push(`${label} email is invalid.`);
 };
 if(!['upto5cr','over5cr'].includes(seller.turnoverBand))errors.push('Select preceding-financial-year turnover for HSN/SAC requirements.');
 if(!['upto5cr','over5cr'].includes(seller.einvoiceHistory))errors.push('Review maximum aggregate turnover in any financial year since 2017–18 for e-invoice applicability.');
 if(invoice.type!=='b2c'&&seller.einvoiceHistory==='over5cr'&&meta.einvoiceStatus!=='exempt')errors.push('Turnover above ₹5 crore in a covered financial year generally requires IRN registration for covered supplies. This integration is unavailable.');
 if(meta.einvoiceStatus==='exempt'&&!text(meta.einvoiceExemption))errors.push('Record the reviewed statutory e-invoice exemption.');
 if(!['b2b','b2c','export'].includes(invoice.type))errors.push('Select an invoice type.');
 if(!CURRENCIES[invoice.currency])errors.push('Choose a supported two-decimal invoice currency.');
 required(seller.companyName,'Seller business name');party(seller,'Seller');if(seller.country!=='IN')errors.push('Seller country must be India.');
 if(validateGstin(seller.gstin))errors.push('A GST-registered seller with a valid GSTIN is required. Unregistered sellers and bills of supply are unsupported.');
 else if(seller.gstin.slice(0,2)!==GST_STATE_CODES[seller.state])errors.push('Seller GSTIN state code does not match the selected state.');
 if(!/^[A-Za-z0-9/-]{1,16}$/.test(text(meta.invoiceNumber)))errors.push('Invoice number must contain 1–16 letters, digits, / or -, unique in the financial year.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(meta.invoiceDate||'')||strictDate(meta.invoiceDate)!==meta.invoiceDate)errors.push('Invoice date must be YYYY-MM-DD.');
 if(meta.dueDate&&(strictDate(meta.dueDate)!==meta.dueDate||meta.dueDate<meta.invoiceDate))errors.push('Due date must be valid and on or after the invoice date.');
 let totals;try{totals=invoiceTotals(invoice);}catch(e){errors.push(e.message);}
 const details=invoice.type!=='b2c'||(totals?.taxable??0)>=50000||meta.recipientRequestsDetails;
 if(details){required(buyer.name,'Recipient name');party(buyer,'Recipient',invoice.type!=='export');}
 if(invoice.type==='b2b'){
  if(validateGstin(buyer.gstin))errors.push('B2B requires the buyer’s valid GSTIN. Local checks are not government verification.');
  else if(buyer.gstin.slice(0,2)!==GST_STATE_CODES[buyer.state])errors.push('Buyer GSTIN state code conflicts with buyer state.');
 }
 if(invoice.type==='b2c'&&text(buyer.gstin))errors.push('A GST-registered buyer needs a B2B Tax Invoice.');
 if(invoice.type!=='export'){
  if(invoice.currency!=='INR')errors.push('Domestic invoices support INR only.');
  if(buyer.country!=='IN')errors.push('Domestic buyer country must be India.');
  if(!GST_STATE_CODES[meta.placeOfSupply])errors.push('Select an explicit domestic place of supply.');
 }else{
  if(!['goods','services'].includes(exp.kind))errors.push('Select export goods or services.');
  if(buyer.country==='IN'||!buyer.country)errors.push('Export destination must be outside India.');
  if(meta.placeOfSupply!=='Outside India')errors.push('Export place of supply must be explicitly Outside India.');
  if(!exp.eligibilityReviewed)errors.push('Confirm the legal export conditions; a foreign address alone does not establish eligibility.');
  if(!['lut','igst'].includes(exp.treatment))errors.push('Select reviewed export tax treatment.');
  if(exp.treatment==='lut'){required(exp.lutReference,'LUT/bond reference');required(exp.lutDate,'LUT/bond date');if(strictDate(exp.lutDate)!==exp.lutDate||exp.lutDate>meta.invoiceDate)errors.push('LUT/bond date must be valid and no later than invoice date.');if(!exp.lutReviewed)errors.push('Confirm LUT/bond validity for this supply.');}
  if(exp.treatment==='igst'){required(exp.notificationReference,'Reviewed IGST eligibility notification');if(!exp.igstEligible)errors.push('Confirm this exporter and supply are legally permitted to export on payment of IGST.');}
  if(invoice.currency!=='INR'){try{if(decimal(exp.inrRate||0)<=0n)errors.push('Enter a positive INR reporting rate.');}catch{errors.push('Invalid INR reporting rate.');}required(exp.rateSource,'INR rate source');required(exp.timeOfSupply,'Time-of-supply date');if(strictDate(exp.timeOfSupply)!==exp.timeOfSupply)errors.push('Time-of-supply date must be valid YYYY-MM-DD.');if(!exp.conversionReviewed)errors.push('Confirm Rule 34 conversion: Customs-notified rate for goods; GAAP rate for services at time of supply.');}
  if(exp.kind==='goods'){if(exp.importerDifferent){required(exp.importer?.name,'Importer name');party(exp.importer||{},'Importer',false);}if(!seller.iec&&!exp.iecExemption)errors.push('Provide IEC or explain the applicable IEC exemption.');}
 }
 const ship=shipping.sameAsBilling===false?shipping.address:buyer;
 if(details){if(shipping.sameAsBilling===false){required(ship?.name,'Delivery recipient');party(ship||{},'Delivery',invoice.type!=='export');}}

 items.forEach((item,index)=>{
  const label=`Line ${index+1}`;required(item.description,`${label} description`);
  if(!['goods','services','charge'].includes(item.kind))errors.push(`${label}: choose goods, services or a charge.`);
  if(invoice.type==='export'&&item.kind!=='charge'&&item.kind!==exp.kind)errors.push(`${label} does not match the export goods/services selection.`);
  const min=seller.turnoverBand==='over5cr'?6:4;
  if(!/^\d+$/.test(text(item.hsn))||text(item.hsn).length<min||text(item.hsn).length>8)errors.push(`${label}: use at least ${min} HSN/SAC digits. This release requires classification even when a B2C exemption may apply.`);
  if(item.kind==='services'&&!text(item.hsn).startsWith('99'))errors.push(`${label}: services need a SAC starting with 99.`);
  for(const key of ['qty','rate','discount','gstRate','cessRate']){try{const n=decimal(item[key]??0,key==='qty'||key==='rate'?6:2);if(key==='qty'&&n===0n||['discount','gstRate','cessRate'].includes(key)&&n>10000n)errors.push(`${label}: invalid ${key}.`);}catch{errors.push(`${label}: invalid ${key}.`);}}
  if(item.kind==='goods')required(item.unit,`${label} unit/UQC`);
  if(item.kind==='charge'&&!item.taxTreatmentReviewed)errors.push(`${label}: confirm the charge’s GST/cess treatment; pure-agent reimbursements are unsupported.`);
 });
 if(meta.reverseCharge!=='no')errors.push('Reverse-charge invoices require a separate supported workflow; choose ordinary forward charge only when applicable.');
 if(!['not-required','exempt'].includes(meta.einvoiceStatus)&&invoice.type!=='b2c')errors.push('IRN registration is unavailable. If e-invoicing applies or is uncertain, do not finalize here.');
 if(invoice.type==='b2c'&&meta.dynamicQrStatus!=='not-required')errors.push('Statutory B2C dynamic QR integration is unavailable; confirm it is not required before finalization.');
 if(!meta.complianceReviewed)errors.push('Review GST classification, place of supply and e-invoice applicability before finalization.');
 required(invoice.signatory,'Authorised signatory name');
 if(invoice.signatureMode==='electronic'){if(!meta.electronicIssueConfirmed)errors.push('Confirm electronic issuance under the IT Act signature exception.');}
 else if(!invoice.signatureImage)errors.push('Upload an authorised signature image, or select and confirm electronic issuance.');
 if(totals&&totals.balance<0)errors.push('Payments received cannot exceed invoice total.');
 return {errors:[...new Set(errors)],warnings,totals,endorsement:invoice.type==='export'?ENDORSEMENTS[exp.treatment]:'',secondTax:UTGST_STATES.has(seller.state)?'UTGST':'SGST'};
}
export function newInvoice(){const date=new Date().toISOString().slice(0,10);return {schemaVersion:2,type:'b2b',template:'modern',currency:'INR',seller:{companyName:'',country:'IN',countryName:'India',state:'',address:'',address2:'',city:'',pin:'',gstin:'',turnoverBand:'',einvoiceHistory:''},buyer:{name:'',country:'IN',countryName:'India',state:'',address:'',city:'',pin:'',gstin:''},shipping:{sameAsBilling:true,address:{country:'IN'}},export:{kind:'goods',treatment:'',inrRate:'',lutReference:''},meta:{invoiceNumber:'INV-0017',invoiceDate:date,dueDate:'',placeOfSupply:'',reverseCharge:'no',einvoiceStatus:'unknown',dynamicQrStatus:'unknown'},items:[{id:1,description:'',hsn:'',kind:'goods',qty:'1',unit:'NOS',rate:'0',discount:'0',gstRate:'18',cessRate:'0'}],paid:'0',notes:'',signatory:'',signatureMode:'electronic'};}
