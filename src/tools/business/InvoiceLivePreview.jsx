import {partyLines} from '../../lib/invoices/model.js';

/** Read-only layout preview; amounts use the same calculation result as finalization. */
export function InvoiceLivePreview({invoice,validation}) {
 const totals=validation.totals;
 const money=value=>Number(value).toLocaleString(invoice.currency==='INR'?'en-IN':'en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
 const party=(value,seller=false)=>partyLines(value,seller).map((line,n)=><div key={n}>{line}</div>);
 const exporting=invoice.type==='export';
 const interstate=exporting||invoice.seller.state!==invoice.meta.placeOfSupply;
 return <article className={`invoice-paper paper-${invoice.template}`} aria-label="Draft invoice document">
  <header className="invoice-paper-header"><div>{invoice.seller.logo&&<img className="invoice-paper-logo" src={invoice.seller.logo} alt="Business logo"/>}<h3>{invoice.seller.companyName||'Your business name'}</h3>{party({...invoice.seller,companyName:''},true)}</div><strong>{exporting?'EXPORT INVOICE':'TAX INVOICE'}</strong></header>
  <div className="invoice-paper-meta"><strong>Invoice: {invoice.meta.invoiceNumber||'—'}</strong><div>Date: {invoice.meta.invoiceDate||'—'}{invoice.meta.dueDate&&<div>Due: {invoice.meta.dueDate}</div>}</div></div>
  <section className="invoice-paper-buyer"><small>{exporting?'SOLD TO':'BILL TO'}</small><strong>{invoice.buyer.name||'Customer name'}</strong>{party({...invoice.buyer,name:''})}{invoice.type==='b2c'&&<div>GSTIN: NA</div>}</section>
  {invoice.shipping.sameAsBilling===false&&<section className="invoice-paper-buyer"><small>SHIP TO</small>{party(invoice.shipping.address)}</section>}
  {invoice.meta.placeOfSupply&&<p>Place of supply: {invoice.meta.placeOfSupply}</p>}
  {exporting&&validation.endorsement&&<p className="invoice-export-note">{validation.endorsement}</p>}
  <div className="invoice-paper-table-wrap"><table><thead><tr><th>Description / HSN</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>{invoice.items.map((item,n)=><tr key={item.id}><td>{item.description||'Item description'}{item.hsn&&<small>{item.hsn}</small>}</td><td>{item.qty} {item.unit}</td><td>{money(item.rate)}</td><td>{totals?money(totals.lines[n].total):'—'}</td></tr>)}</tbody></table></div>
  {totals?<dl className="invoice-paper-totals">{[['Subtotal',totals.gross],...(totals.discount?[['Discount',totals.discount]]:[]),...(interstate?[['IGST',totals.igst]]:[['CGST',totals.cgst],[validation.secondTax||'SGST',totals.sgst]]),...(totals.cess?[['Cess',totals.cess]]:[]),...(totals.roundOff?[['Round off',totals.roundOff]]:[]),['Total',totals.total],...(totals.paid?[['Received',totals.paid]]:[]),['Amount due',totals.balance]].map(([label,value])=><div className={label==='Amount due'?'invoice-paper-balance':''} key={label}><dt>{label}</dt><dd>{label==='Amount due'?invoice.currency+' ':''}{money(value)}</dd></div>)}</dl>:<p role="status">Enter valid quantities and amounts to calculate totals.</p>}
  {invoice.notes&&<section className="invoice-paper-notes"><strong>Notes & terms</strong><p>{invoice.notes}</p></section>}
  <footer className="invoice-paper-footer"><div>{invoice.seller.upiId&&<div>UPI: {invoice.seller.upiId}</div>}{invoice.seller.bankName&&<div>Bank: {invoice.seller.bankName}</div>}{invoice.seller.accountNo&&<div>Account: {invoice.seller.accountNo}</div>}{invoice.seller.ifsc&&<div>IFSC: {invoice.seller.ifsc}</div>}</div><div>{invoice.signatureMode==='image'&&invoice.signatureImage&&<img src={invoice.signatureImage} alt="Authorised signature"/>}{invoice.signatory&&<div>{invoice.signatory}<br/>Authorised signatory</div>}</div></footer>
  <div className="invoice-paper-draft">DRAFT · NOT FINALIZED</div>
 </article>;
}
