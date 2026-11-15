import {newInvoice} from './model.js';
export function sampleInvoice(type='b2b'){
 const i=newInvoice();i.type=type;i.seller={...i.seller,companyName:'OrbitBoard Demo Supply',address:'17 Synthetic Business Park',city:'Mumbai',state:'Maharashtra',pin:'400001',gstin:'27AAPFU0939F1ZV',turnoverBand:'upto5cr',einvoiceHistory:'upto5cr',phone:'+91 90000 00000',email:'seller@example.test',iec:'SYNTHETIC'};
 i.buyer={...i.buyer,name:'Synthetic Customer',address:'25 Sample Avenue',city:'Mumbai',state:'Maharashtra',pin:'400001',gstin:type==='b2b'?'27AAPFU0939F1ZV':''};
 i.meta={...i.meta,invoiceNumber:'INV-0017',invoiceDate:'2026-11-15',dueDate:'2026-12-15',placeOfSupply:'Maharashtra',einvoiceStatus:'not-required',dynamicQrStatus:'not-required',complianceReviewed:true,electronicIssueConfirmed:true};
 i.items=[{...i.items[0],description:'Synthetic office supplies',hsn:'480256',qty:'3',rate:'1250.55',discount:'5'}];i.signatory='Synthetic Authorised Person';
 if(type==='export'){i.buyer={...i.buyer,country:'GB',countryName:'United Kingdom',state:'England',city:'London',address:'17 Synthetic Trade Road',pin:'SW1A 1AA',gstin:'',taxId:'SYNTHETIC-VAT'};i.currency='USD';i.meta.placeOfSupply='Outside India';i.export={kind:'goods',treatment:'lut',lutReference:'SYNTHETIC-LUT',lutDate:'2026-04-01',lutReviewed:true,eligibilityReviewed:true,inrRate:'84.25',timeOfSupply:'2026-11-15',rateSource:'Synthetic test rate, not a market rate',conversionReviewed:true,packages:'2 cartons',grossWeight:'6 kg',netWeight:'5 kg',origin:'India',incoterms:'FCA Mumbai',portLoading:'Mumbai',portDischarge:'London'};}
 return i;
}
