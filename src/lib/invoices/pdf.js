import {PDFDocument,rgb} from 'pdf-lib';
import {validateModel,partyLines,TEMPLATES,CURRENCIES,renderingErrors} from './model.js';
import {GST_STATE_CODES} from './gstIdentity.js';
import {numToWords} from '../../tools/business/gstInvoiceEngine.js';
export function currencyWords(value,currency){
 const cents=Math.round(value*100),whole=Math.floor(cents/100),fraction=cents%100;
 const international=n=>n>=1e9?`${international(Math.floor(n/1e9))} Billion${n%1e9?' '+international(n%1e9):''}`:n>=1e6?`${international(Math.floor(n/1e6))} Million${n%1e6?' '+international(n%1e6):''}`:n>=1000?`${numToWords(Math.floor(n/1000))} Thousand${n%1000?' '+numToWords(n%1000):''}`:numToWords(n);
 const names=CURRENCIES[currency];return `${currency==='INR'?numToWords(whole):international(whole)} ${names[0]}${fraction?' and '+numToWords(fraction)+' '+names[1]:''} Only`;
}
export async function generateUpgradedPDF(invoice,options={}){
 const bounds=renderingErrors(invoice);if(bounds.length)throw new Error(bounds.join('\n'));
 const valid=validateModel(invoice);if(valid.errors.length&&!options.draft)throw new Error(valid.errors.join('\n'));
 const totals=valid.totals;if(!totals)throw new Error('Correct numeric fields before preview.');
 const theme=TEMPLATES.find(t=>t.id===(options.template||invoice.template))||TEMPLATES[0];
 const doc=await PDFDocument.create();const {default:fontkit}=await import('@pdf-lib/fontkit');doc.registerFontkit(fontkit);
 const fonts=options.fonts;if(!fonts)throw new Error('Invoice fonts are required.');
 const regular=await doc.embedFont(fonts.regular,{subset:true}),bold=await doc.embedFont(fonts.bold,{subset:true});
 const chars=new Set(regular.getCharacterSet());
 const check=value=>{if(typeof value==='string'&&[...value].some(c=>!/[\r\n\t]/.test(c)&&!chars.has(c.codePointAt(0))))throw new Error('PDF font does not support some entered characters. Use supported Latin text; the full draft is retained.');if(value&&typeof value==='object')for(const [key,v]of Object.entries(value))if(!/logo|signatureImage/.test(key))check(v);};check(invoice);
 const color=options.grayscale?rgb(.2,.2,.2):rgb(...theme.accent),ink=rgb(.12,.12,.14),gray=rgb(.75,.75,.77);
 let page,y;const size=theme.fontSize,gap=theme.gap;
 const money=v=>Number(v).toLocaleString(invoice.currency==='INR'?'en-IN':'en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
 const text=(v,x,at,s=size,font=regular,c=ink)=>page.drawText(String(v??''),{x,y:at,size:s,font,color:c});
 const wrap=(value,width,s=size,font=regular)=>{const out=[];for(const para of String(value??'').replaceAll('\r','').split('\n')){let line='';for(const word of para.split(/\s+/)){const next=line?line+' '+word:word;if(font.widthOfTextAtSize(next,s)<=width){line=next;continue;}if(line){out.push(line);line='';}for(const char of word){if(font.widthOfTextAtSize(line+char,s)>width&&line){out.push(line);line='';}line+=char;}}out.push(line);}return out;};
 function newPage(){page=doc.addPage([595.28,841.89]);y=796;const n=doc.getPageCount();if(n>1){text(`${invoice.seller.companyName}  |  ${invoice.meta.invoiceNumber}`,30,814,8,bold,color);page.drawLine({start:{x:30,y:805},end:{x:565,y:805},thickness:.5,color:gray});}if(options.draft)text('DRAFT - NOT FINALIZED',30,20,8,bold);text(`Page ${n}`,510,20,7);}
 function ensure(h){if(y-h<45)newPage();}
 function block(value,{heading=false,width=535}={}){const lines=wrap(value,width,heading?size+1:size,heading?bold:regular);for(const line of lines){ensure(gap+3);text(line,30,y,heading?size+1:size,heading?bold:regular);y-=gap;}y-=3;}
 function section(label){ensure(gap*2);if(theme.id==='ledger')page.drawLine({start:{x:30,y:y+8},end:{x:565,y:y+8},thickness:.6,color:gray});block(label,{heading:true});}
 async function image(data,width,height,x){if(!data)return;const bytes=Uint8Array.from(atob(data.split(',')[1]||''),c=>c.charCodeAt(0));let embedded;try{embedded=data.startsWith('data:image/png')?await doc.embedPng(bytes):await doc.embedJpg(bytes);}catch{throw new Error('Use a valid PNG/JPEG logo or signature.');}const fitted=embedded.scaleToFit(width,height);page.drawImage(embedded,{x,y:y-height,...fitted});}
 newPage();
 if(theme.id==='ledger'){page.drawRectangle({x:30,y:y-4,width:535,height:29,borderWidth:1,borderColor:color});}
 if(invoice.seller.logo){await image(invoice.seller.logo,90,42,470);}
 for(const line of wrap(invoice.seller.companyName||'Business name',invoice.seller.logo?420:535,18,bold)){ensure(25);text(line,30,y,18,bold,color);y-=24;}y-=invoice.seller.logo?25:12;
 text(`Invoice: ${invoice.meta.invoiceNumber}`,30,y,11,bold);
 const date=`Date: ${invoice.meta.invoiceDate}`;text(date,565-regular.widthOfTextAtSize(date,size),y);
 y-=gap;if(invoice.meta.dueDate){const due=`Due: ${invoice.meta.dueDate}`;text(due,565-regular.widthOfTextAtSize(due,size),y);y-=gap;}y-=10;
 block(invoice.type==='export'?'EXPORT INVOICE':'TAX INVOICE',{heading:true});
 const sellerLines=partyLines(invoice.seller,true).slice(1),buyerLines=partyLines(invoice.buyer);
 const recipientTitle=theme.id==='commercial'||invoice.type==='export'?'Sold to':'Bill to';
 if(['ledger','commercial','compact'].includes(theme.id)||invoice.type==='export'){
  const left=['Seller',...sellerLines,...(invoice.seller.iec?[`IEC: ${invoice.seller.iec}`]:[])].flatMap(v=>wrap(v,255));
  const right=[recipientTitle,...buyerLines,...(invoice.type==='b2c'?['GSTIN: NA']:[])].flatMap(v=>wrap(v,255));
  const lines=Math.max(left.length,right.length);for(let n=0;n<lines;n++){ensure(gap+4);if(left[n])text(left[n],30,y,size,n===0?bold:regular);if(right[n])text(right[n],310,y,size,n===0?bold:regular);y-=gap;}y-=8;
 }else{
  for(const line of sellerLines)block(line);
  if(invoice.seller.iec)block(`IEC: ${invoice.seller.iec}`);
  if(buyerLines.some(v=>v!=='India')){section(recipientTitle);for(const line of buyerLines)block(line);}
  if(invoice.type==='b2c')block('GSTIN: NA');
 }
 if(invoice.shipping?.sameAsBilling===false){section('Ship to');for(const line of partyLines(invoice.shipping.address))block(line);}
 else if(buyerLines.some(v=>v!=='India'))block(`Ship to: same as ${recipientTitle.toLowerCase()} address`);
 block(`Place of supply: ${invoice.meta.placeOfSupply}${invoice.type!=='export'?' / '+(GST_STATE_CODES[invoice.meta.placeOfSupply]||''):''}${invoice.type==='export'?'':' ('+(invoice.seller.state===invoice.meta.placeOfSupply?'CGST + '+valid.secondTax:'IGST')+')'}`);
 block('Reverse charge: No');if(invoice.meta.poReference)block(`Purchase order: ${invoice.meta.poReference}`);
 if(invoice.type==='export'){
  section(`Export of ${invoice.export.kind}`);block(valid.endorsement);
  for(const [label,v]of [['LUT / bond',invoice.export.treatment==='lut'?invoice.export.lutReference:''],['LUT / bond date',invoice.export.treatment==='lut'?invoice.export.lutDate:''],['Currency',invoice.currency]])if(v)block(`${label}: ${v}`);
  if(invoice.currency!=='INR'){block(`INR per ${invoice.currency}: ${invoice.export.inrRate} | Time of supply: ${invoice.export.timeOfSupply}`);block(`Conversion reference: ${invoice.export.rateSource}`);}
  if(invoice.export.kind==='goods'){
   const labels={packages:'Packages',grossWeight:'Gross weight',netWeight:'Net weight',origin:'Country of origin',incoterms:'Incoterms',portLoading:'Port of loading',portDischarge:'Port of discharge',transport:'Transport reference',deliveryTerms:'Delivery terms',freight:'Freight reference',insurance:'Insurance reference'};
   if(theme.id==='shipping')section('Packaging and transport');
   const details=Object.entries(labels).filter(([key])=>invoice.export[key]).map(([key,label])=>`${label}: ${invoice.export[key]}`);
   for(let d=0;d<details.length;d+=2){const a=wrap(details[d],255),b=wrap(details[d+1]||'',255);for(let n=0;n<Math.max(a.length,b.length);n++){ensure(gap+3);if(a[n])text(a[n],30,y);if(b[n])text(b[n],310,y);y-=gap;}y-=3;}
   if(invoice.export.importerDifferent){section('Importer');for(const line of partyLines(invoice.export.importer||{}))block(line);}
  }
 }
 if(invoice.type!=='export'&&invoice.items.some(item=>item.kind==='goods')){const details=Object.entries({packages:'Packages',grossWeight:'Gross weight',netWeight:'Net weight',transport:'Transport reference',deliveryTerms:'Delivery terms',origin:'Country of origin'}).filter(([key])=>invoice.shipping?.[key]);if(details.length){section('Goods delivery');for(const [key,label]of details)block(`${label}: ${invoice.shipping[key]}`);}}
 const columns=[['#',22],['Description',136],['HSN/SAC',48],['Qty / unit',38],['Rate',55],['Disc %',40],['Taxable',62],['Tax',57],['Amount',77]];
 const starts=[];let x=30;columns.forEach(([,w])=>{starts.push(x);x+=w;});
 function tableHeader(){ensure(32);page.drawRectangle({x:30,y:y-5,width:535,height:20,...(theme.id==='compact'?{borderColor:gray,borderWidth:.5}:{color})});columns.forEach(([label],i)=>text(label,starts[i]+3,y+2,7,bold,theme.id==='compact'?ink:rgb(1,1,1)));y-=23;}
 tableHeader();invoice.items.forEach((item,index)=>{
  const c=totals.lines[index];const vals=[index+1,item.description+(item.kind==='charge'?' (charge)':''),item.hsn,`${item.qty} ${item.unit||''}`,money(item.rate),item.discount||'0',money(c.taxable),`${invoice.type==='export'&&invoice.export.treatment==='lut'?'0':item.gstRate}%${Number(item.cessRate)&&!(invoice.type==='export'&&invoice.export.treatment==='lut')?' + '+item.cessRate+'% cess':''}\n${money(c.igst+c.cgst+c.sgst+c.cess)}`,money(c.total)];
  const lines=vals.map((v,i)=>wrap(v,columns[i][1]-6,7));const count=Math.max(...lines.map(v=>v.length));
  if(count*11<700&&y-count*11<52){newPage();tableHeader();}
  for(let row=0;row<count;row++){if(y<58){newPage();tableHeader();}lines.forEach((ls,i)=>text(ls[row]||'',starts[i]+3,y,7,i===8?bold:regular));y-=11;}
  page.drawLine({start:{x:30,y:y+5},end:{x:565,y:y+5},thickness:.35,color:gray});y+=theme.id==='compact'?-3:-7;
 });
 if(invoice.notes){section('Notes / terms');block(invoice.notes);}
 const bank=[['Bank',invoice.seller.bankName],['Account',invoice.seller.accountNo],['IFSC',invoice.seller.ifsc],['UPI',invoice.seller.upiId]].filter(([,v])=>v);if(bank.length){section('Bank details');bank.forEach(([label,v])=>block(`${label}: ${v}`));}
 const pairs=[['Subtotal',totals.gross],['Discount',totals.discount],['Taxable value',totals.taxable],...(invoice.type==='export'||invoice.seller.state!==invoice.meta.placeOfSupply?[['IGST',totals.igst]]:[['CGST',totals.cgst],[valid.secondTax,totals.sgst]]),...(totals.cess?[['Cess',totals.cess]]:[]),['Round off',totals.roundOff],['Total',totals.total],['Received',totals.paid],['Balance due',totals.balance]];
 const words=wrap(currencyWords(totals.total,invoice.currency),535,9,bold);const sign=wrap(`Authorised signatory: ${invoice.signatory}`,250,9,bold);
 const reportText=totals.inr?`INR reporting: Taxable ${money(totals.inr.taxable)} | IGST ${money(totals.inr.igst)} | Cess ${money(totals.inr.cess)}`:'';
 const reportHeight=reportText?wrap(reportText,535).length*gap+3:0;
 ensure(49+pairs.length*17+words.length*13+sign.length*13+reportHeight+(invoice.signatureImage?42:0)+(invoice.signatureMode==='electronic'?12:0));y-=15;
 for(const[label,val]of pairs){text(label,310,y,9,bold);const amount=`${invoice.currency} ${money(val)}`;text(amount,565-bold.widthOfTextAtSize(amount,9),y,9,bold);y-=17;}
 y-=8;for(const line of words){text(line,30,y,9,bold);y-=13;}
 if(reportText)block(reportText);
 y-=10;if(invoice.signatureImage){await image(invoice.signatureImage,140,35,315);y-=42;}
 for(const line of sign){text(line,310,y,9,bold);y-=13;}
 if(invoice.signatureMode==='electronic'){text('Issued electronically',310,y,8);y-=12;}
 return new Blob([await doc.save()],{type:'application/pdf'});
}
