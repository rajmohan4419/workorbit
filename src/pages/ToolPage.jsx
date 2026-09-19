import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Code2, BriefcaseBusiness, Coins, Calculator } from 'lucide-react';
import { TOOLS, TOOL_CONTENT } from '../data/tools';
import { mergePdfFiles, extractPdfPages, splitPdfPages, reorderPdfPages, optimizePdf, createEditedPdf, loadPdf } from '../engines/pdf';
import { renderPdfPages } from '../engines/pdfRenderer';

const money = n => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.max(0, Number(n) || 0));
const num = v => Math.max(0, Number(v) || 0);

function Field({label, value, onChange, type='number', placeholder}) {
  return <label className="block"><span className="text-xs font-medium text-slate-400">{label}</span><input type={type} min={type==='number' ? 0 : undefined} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-violet-500"/></label>
}
function Result({label,value,highlight=false}) {
  return <div className={`rounded-xl border px-4 py-3 flex items-center justify-between ${highlight?'border-violet-500/40 bg-violet-500/10':'border-slate-800 bg-slate-950'}`}><span className="text-xs text-slate-400">{label}</span><strong className={highlight?'text-lg text-violet-300':'text-sm text-white'}>{value}</strong></div>
}

function calculateNewTax(taxable) {
  const slabs=[[400000,0],[400000,.05],[400000,.10],[400000,.15],[400000,.20],[400000,.25],[Infinity,.30]];
  let remaining=taxable, tax=0;
  for(const [limit,rate] of slabs){const amount=Math.min(remaining,limit); if(amount<=0) break; tax+=amount*rate; remaining-=amount;}
  if(taxable<=1200000) tax=Math.max(0,tax-60000);
  return tax*1.04;
}
function calculateOldTax(taxable) {
  const slabs=[[250000,0],[250000,.05],[500000,.20],[Infinity,.30]];
  let remaining=taxable,tax=0;
  for(const [limit,rate] of slabs){const amount=Math.min(remaining,limit); if(amount<=0) break; tax+=amount*rate; remaining-=amount;}
  if(taxable<=500000) tax=Math.max(0,tax-12500);
  return tax*1.04;
}
function SalaryCalculator() {
  const [ctc,setCtc]=useState('1000000');
  const [basicPct,setBasicPct]=useState('40');
  const [variable,setVariable]=useState('0');
  const [gratuity,setGratuity]=useState('0');
  const [pfCap,setPfCap]=useState(true);
  const [regime,setRegime]=useState('new');
  const [state,setState]=useState('Karnataka');

  const result=useMemo(()=>{
    const annualCtc=num(ctc), basic=annualCtc*num(basicPct)/100;
    const monthlyBasic=basic/12;
    const employeePf=pfCap ? Math.min(monthlyBasic,15000)*.12*12 : basic*.12;
    const employerPf=employeePf;
    const annualGratuity=num(gratuity);
    const annualVariable=num(variable);
    const grossCash=Math.max(0,annualCtc-employerPf-annualGratuity);
    const fixedGross=Math.max(0,grossCash-annualVariable);
    const standardDeduction=regime==='new'?75000:50000;
    const taxable=Math.max(0,fixedGross-standardDeduction);
    const incomeTax=regime==='new'?calculateNewTax(taxable):calculateOldTax(taxable);
    const pt=state==='Karnataka' && fixedGross/12>=25000 ? 2500 : 0;
    const annualTakeHome=Math.max(0,fixedGross-employeePf-incomeTax-pt);
    return {annualCtc,basic,employeePf,employerPf,annualGratuity,annualVariable,fixedGross,taxable,incomeTax,pt,annualTakeHome,monthlyTakeHome:annualTakeHome/12};
  },[ctc,basicPct,variable,gratuity,pfCap,regime,state]);

  return <div className="space-y-5">
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label="Annual CTC (₹)" value={ctc} onChange={setCtc}/>
      <Field label="Basic salary as % of CTC" value={basicPct} onChange={setBasicPct}/>
      <Field label="Annual variable pay included in CTC (₹)" value={variable} onChange={setVariable}/>
      <Field label="Annual gratuity included in CTC (₹)" value={gratuity} onChange={setGratuity}/>
    </div>
    <div className="grid sm:grid-cols-2 gap-4">
      <label className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 flex items-center justify-between"><span><span className="block text-xs font-medium">EPF calculation</span><span className="block text-[11px] text-slate-500 mt-1">Cap employee PF at ₹1,800/month</span></span><input type="checkbox" checked={pfCap} onChange={e=>setPfCap(e.target.checked)} /></label>
      <label className="block"><span className="text-xs font-medium text-slate-400">Tax regime</span><select value={regime} onChange={e=>setRegime(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-violet-500"><option value="new">New regime (default)</option><option value="old">Old regime</option></select></label>
    </div>
    <label className="block"><span className="text-xs font-medium text-slate-400">Professional tax state</span><select value={state} onChange={e=>setState(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-violet-500"><option>Karnataka</option><option value="none">Other / calculate separately</option></select></label>

    <div className="grid sm:grid-cols-2 gap-3">
      <Result label="Estimated monthly take-home" value={`₹ ${money(result.monthlyTakeHome)}`} highlight/>
      <Result label="Estimated annual take-home" value={`₹ ${money(result.annualTakeHome)}`} highlight/>
      <Result label="Annual income tax + cess" value={`₹ ${money(result.incomeTax)}`}/>
      <Result label="Employee EPF" value={`₹ ${money(result.employeePf)}`}/>
      <Result label="Employer EPF included in CTC" value={`₹ ${money(result.employerPf)}`}/>
      <Result label="Professional tax" value={`₹ ${money(result.pt)}`}/>
    </div>
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-400 space-y-2">
      <div className="flex justify-between"><span>Gross cash salary before employee deductions</span><span>₹ {money(result.fixedGross)}</span></div>
      <div className="flex justify-between"><span>Standard deduction</span><span>₹ {money(regime==='new'?75000:50000)}</span></div>
      <div className="flex justify-between"><span>Taxable salary used</span><span>₹ {money(result.taxable)}</span></div>
    </div>
    <p className="text-xs text-slate-500">Estimate only. Actual payslips can differ because CTC structures, PF eligibility, tax declarations, exemptions, payroll timing and employer policies vary. This version uses AY 2026-27 tax rules for a resident individual under 60 and a simplified PF model.</p>
  </div>
}

function SalaryHike() { const [old,setOld]=useState('1000000'),[next,setNext]=useState('1200000'); const o=num(old),n=num(next),h=o?((n-o)/o)*100:0; return <><Field label="Current annual salary (₹)" value={old} onChange={setOld}/><Field label="New annual salary (₹)" value={next} onChange={setNext}/><Result label="Hike" value={`${h.toFixed(2)}%`} highlight/><Result label="Increase" value={`₹ ${money(n-o)} / year`}/></> }
function Offer() {
  const [a,setA]=useState('1000000'),[b,setB]=useState('1300000');
  const [basicPct,setBasicPct]=useState('40'),[variableA,setVariableA]=useState('0'),[variableB,setVariableB]=useState('0');
  const [regime,setRegime]=useState('new');

  const calculateTakeHome=(ctc,variable)=>{
    const annual=num(ctc), basic=annual*num(basicPct)/100, monthlyBasic=basic/12;
    const employeePf=Math.min(monthlyBasic,15000)*.12*12;
    const employerPf=employeePf, fixedGross=Math.max(0,annual-employerPf-num(variable));
    const standardDeduction=regime==='new'?75000:50000;
    const taxable=Math.max(0,fixedGross-standardDeduction);
    const tax=regime==='new'?calculateNewTax(taxable):calculateOldTax(taxable);
    const pt=fixedGross/12>=25000?2500:0;
    const annualTakeHome=Math.max(0,fixedGross-employeePf-tax-pt);
    return {annualTakeHome,monthlyTakeHome:annualTakeHome/12};
  };
  const first=calculateTakeHome(a,variableA), second=calculateTakeHome(b,variableB);
  const ctcDiff=num(b)-num(a), takeHomeDiff=second.annualTakeHome-first.annualTakeHome;
  return <div className="space-y-5">
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">
        <p className="text-sm font-bold text-slate-200">Offer A</p>
        <Field label="Annual CTC (₹)" value={a} onChange={setA}/>
        <Field label="Variable pay included (₹)" value={variableA} onChange={setVariableA}/>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">
        <p className="text-sm font-bold text-slate-200">Offer B</p>
        <Field label="Annual CTC (₹)" value={b} onChange={setB}/>
        <Field label="Variable pay included (₹)" value={variableB} onChange={setVariableB}/>
      </div>
    </div>
    <Field label="Basic salary as % of CTC" value={basicPct} onChange={setBasicPct}/>
    <label className="block"><span className="text-xs font-medium text-slate-400">Tax regime</span><select value={regime} onChange={e=>setRegime(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-violet-500"><option value="new">New regime</option><option value="old">Old regime</option></select></label>
    <div className="grid sm:grid-cols-2 gap-3">
      <Result label="Offer A monthly take-home" value={`₹ ${money(first.monthlyTakeHome)}`} highlight/>
      <Result label="Offer B monthly take-home" value={`₹ ${money(second.monthlyTakeHome)}`} highlight/>
      <Result label="CTC difference" value={`₹ ${money(ctcDiff)} / year`}/>
      <Result label="Take-home difference" value={`₹ ${money(takeHomeDiff)} / year`}/>
      <Result label="Take-home difference / month" value={`₹ ${money(takeHomeDiff/12)}`}/>
      <Result label="Offer B CTC increase" value={`${(num(a)?ctcDiff/num(a)*100:0).toFixed(2)}%`}/>
    </div>
    <p className="text-xs text-slate-500">This comparison uses the same simplified salary model as the CTC calculator. Actual offers can differ because of exemptions, deductions, PF structure, gratuity, bonuses, insurance and employer-specific payroll rules.</p>
  </div>
}
function Notice() { const [date,setDate]=useState(new Date().toISOString().slice(0,10)),[days,setDays]=useState('60'); const d=new Date(date); const valid=!Number.isNaN(d.getTime()); if(valid) d.setDate(d.getDate()+num(days)); return <><Field label="Resignation date" value={date} onChange={setDate} type="date"/><Field label="Notice period (days)" value={days} onChange={setDays}/>{valid?<Result label="Calculated last working date" value={d.toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})} highlight/>:<p className="text-sm text-red-400">Enter a valid resignation date.</p>}<p className="text-xs text-slate-500">Company policy and whether the resignation day counts can change the actual date by a day.</p></> }
function Experience() { const [from,setFrom]=useState('2012-01-01'),[to,setTo]=useState(new Date().toISOString().slice(0,10)); const start=new Date(from),end=new Date(to); const valid=!Number.isNaN(start.getTime())&&!Number.isNaN(end.getTime())&&end>=start; const d=valid?(end-start)/86400000:0,years=Math.floor(d/365.2425),months=Math.floor((d-years*365.2425)/30.44); return <><Field label="Start date" value={from} onChange={setFrom} type="date"/><Field label="End date" value={to} onChange={setTo} type="date"/>{valid?<Result label="Approximate experience" value={`${years} years ${months} months`} highlight/>:<p className="text-sm text-red-400">Choose an end date on or after the start date.</p>}</> }
function ExportActions({content,filename='orbitboard-result.txt'}) {
  const [copied,setCopied]=useState(false);
  const copy=async()=>{try{await navigator.clipboard.writeText(content);setCopied(true);setTimeout(()=>setCopied(false),1500)}catch{}};
  const download=()=>{const blob=new Blob([content],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url)};
  return <div className="flex flex-wrap gap-2 pt-2"><button type="button" onClick={copy} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500">{copied?'Copied':'Copy result'}</button><button type="button" onClick={download} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-300">Export .txt</button></div>
}
function Converter({type}) {
  const configs={length:{units:{mm:1,cm:10,m:1000,km:1000000,in:25.4,ft:304.8,mi:1609344},labels:{mm:'Millimetres',cm:'Centimetres',m:'Metres',km:'Kilometres',in:'Inches',ft:'Feet',mi:'Miles'}},weight:{units:{g:1,kg:1000,oz:28.349523125,lb:453.59237,t:1000000},labels:{g:'Grams',kg:'Kilograms',oz:'Ounces',lb:'Pounds',t:'Tonnes'}},time:{units:{s:1,min:60,h:3600,d:86400},labels:{s:'Seconds',min:'Minutes',h:'Hours',d:'Days'}}};
  const cfg=configs[type]; const keys=Object.keys(cfg.units); const [value,setValue]=useState('1'); const [from,setFrom]=useState(keys[0]); const [to,setTo]=useState(keys[1]||keys[0]);
  const result=num(value)*cfg.units[from]/cfg.units[to]; const text=String(value)+' '+cfg.labels[from]+' = '+(Number.isFinite(result)?result.toLocaleString('en-IN',{maximumFractionDigits:8}):'Invalid')+' '+cfg.labels[to];
  return <div className="space-y-5"><Field label="Value" value={value} onChange={setValue}/><div className="grid sm:grid-cols-2 gap-4"><label className="block"><span className="text-xs font-medium text-slate-400">From</span><select value={from} onChange={e=>setFrom(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm">{keys.map(k=><option key={k} value={k}>{cfg.labels[k]}</option>)}</select></label><label className="block"><span className="text-xs font-medium text-slate-400">To</span><select value={to} onChange={e=>setTo(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm">{keys.map(k=><option key={k} value={k}>{cfg.labels[k]}</option>)}</select></label></div><Result label="Converted value" value={text} highlight/><ExportActions content={text} filename={'orbitboard-'+type+'-conversion.txt'}/></div>
}
function TemperatureConverter() {
  const [value,setValue]=useState('25'); const [from,setFrom]=useState('C'); const [to,setTo]=useState('F');
  const toC=v=>from==='C'?v:from==='F'?(v-32)*5/9:v-273.15; const c=toC(num(value)); const result=to==='C'?c:to==='F'?c*9/5+32:c+273.15; const text=String(value)+' '+from+' = '+(Number.isFinite(result)?result.toFixed(6):'Invalid')+' '+to;
  return <div className="space-y-5"><Field label="Temperature" value={value} onChange={setValue}/><div className="grid sm:grid-cols-2 gap-4">{['from','to'].map(side=><label key={side} className="block"><span className="text-xs font-medium text-slate-400">{side==='from'?'From':'To'}</span><select value={side==='from'?from:to} onChange={e=>side==='from'?setFrom(e.target.value):setTo(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"><option value="C">Celsius</option><option value="F">Fahrenheit</option><option value="K">Kelvin</option></select></label>)}</div><Result label="Converted value" value={text} highlight/><ExportActions content={text} filename="orbitboard-temperature-conversion.txt"/></div>
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ImageConverter({format}) {
  const [file,setFile]=useState(null);
  const [quality,setQuality]=useState('0.92');
  const [preview,setPreview]=useState('');
  const [status,setStatus]=useState('');
  const isJpg=format==='image/jpeg';
  const ext=isJpg?'jpg':'png';

  const convert=async()=>{
    if(!file){setStatus('Choose an image first.');return;}
    setStatus('Converting...');
    const url=URL.createObjectURL(file);
    try {
      const image=await new Promise((resolve,reject)=>{
        const img=new Image();
        img.onload=()=>resolve(img);
        img.onerror=reject;
        img.src=url;
      });
      const canvas=document.createElement('canvas');
      canvas.width=image.naturalWidth; canvas.height=image.naturalHeight;
      const ctx=canvas.getContext('2d');
      if(isJpg){ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);}
      ctx.drawImage(image,0,0);
      setPreview(canvas.toDataURL('image/'+(isJpg?'jpeg':'png'),isJpg?Number(quality):undefined));
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/'+(isJpg?'jpeg':'png'),isJpg?Number(quality):undefined));
      if(!blob) throw new Error('Could not create output image');
      downloadBlob(blob,(file.name.replace(/\\.[^.]+$/,'')||'orbitboard-image')+'.'+ext);
      setStatus('Done — your converted image is ready.');
    } catch { setStatus('Could not convert this image. Try another file.'); }
    finally { URL.revokeObjectURL(url); }
  };

  return <div className="space-y-5">
    <label className="block"><span className="text-xs font-medium text-slate-400">Image file</span><input type="file" accept="image/*" onChange={e=>{setFile(e.target.files?.[0]||null);setStatus('');}} className="mt-2 block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"/></label>
    {isJpg&&<label className="block"><span className="text-xs font-medium text-slate-400">JPG quality: {Math.round(Number(quality)*100)}%</span><input type="range" min="0.5" max="1" step="0.01" value={quality} onChange={e=>setQuality(e.target.value)} className="mt-3 w-full"/></label>}
    <button onClick={convert} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold hover:bg-violet-500">Convert to {ext.toUpperCase()}</button>
    {preview&&<img src={preview} alt="Converted preview" className="max-h-72 max-w-full rounded-2xl border border-slate-800 object-contain"/>}
    {status&&<p aria-live="polite" className="text-sm text-slate-400">{status}</p>}
    <p className="text-xs text-slate-500">Processed locally in your browser. Your image is not uploaded.</p>
  </div>
}

function createPdfFromJpeg(jpegBytes,width,height) {
  const encoder=new TextEncoder();
  const header=new Uint8Array([37,80,68,70,45,49,46,52,10,37,255,255,255,255,10]);
  const parts=[header]; const offsets=[0]; let position=header.length;
  const add=(bytes)=>{offsets.push(position);parts.push(bytes);position+=bytes.length;};
  const text=s=>encoder.encode(s);
  add(text('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n'));
  add(text('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n'));
  add(text('3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 '+width+' '+height+'] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >> endobj\n'));
  add(text('4 0 obj << /Type /XObject /Subtype /Image /Width '+width+' /Height '+height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpegBytes.length+' >> stream\n'));
  parts.push(jpegBytes); position+=jpegBytes.length; parts.push(text('\nendstream\nendobj\n')); position+=text('\nendstream\nendobj\n').length;
  const stream=text('q\n'+width+' 0 0 '+height+' 0 0 cm\n/Im0 Do\nQ\n');
  add(text('5 0 obj << /Length '+stream.length+' >> stream\n')); parts.push(stream); position+=stream.length; parts.push(text('endstream\nendobj\n')); position+=text('endstream\nendobj\n').length;
  const xrefStart=position;
  let xref='xref\n0 6\n0000000000 65535 f \n';
  for(let i=1;i<=5;i++) xref+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
  xref+='trailer << /Size 6 /Root 1 0 R >>\nstartxref\n'+xrefStart+'\n%%EOF';
  parts.push(text(xref));
  return new Blob(parts,{type:'application/pdf'});
}

async function unzipXlsxEntries(file) {
  const bytes=new Uint8Array(await file.arrayBuffer());
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let eocd=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65558);i--) {
    if(view.getUint32(i,true)===0x06054b50){eocd=i;break;}
  }
  if(eocd<0) throw new Error('Not a valid XLSX/ZIP file');
  const cdOffset=view.getUint32(eocd+16,true), count=view.getUint16(eocd+10,true);
  const entries={}; let p=cdOffset;
  for(let i=0;i<count;i++){
    if(view.getUint32(p,true)!==0x02014b50) throw new Error('Invalid XLSX directory');
    const method=view.getUint16(p+10,true), compSize=view.getUint32(p+20,true);
    const nameLen=view.getUint16(p+28,true), extraLen=view.getUint16(p+30,true), commentLen=view.getUint16(p+32,true);
    const localOffset=view.getUint32(p+42,true);
    const name=new TextDecoder().decode(bytes.slice(p+46,p+46+nameLen));
    const lp=localOffset, localNameLen=view.getUint16(lp+26,true), localExtraLen=view.getUint16(lp+28,true);
    const start=lp+30+localNameLen+localExtraLen;
    const compressed=bytes.slice(start,start+compSize);
    let data;
    if(method===0) data=compressed;
    else if(method===8){
      const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      data=new Uint8Array(await new Response(stream).arrayBuffer());
    } else throw new Error('Unsupported XLSX compression method');
    entries[name]=new TextDecoder().decode(data);
    p+=46+nameLen+extraLen+commentLen;
  }
  return entries;
}

function xlsxCellValue(cell,sharedStrings) {
  const type=cell.getAttribute('t'), value=cell.getElementsByTagNameNS('*','v')[0]?.textContent||'';
  if(type==='s') return sharedStrings[Number(value)]??value;
  if(type==='inlineStr') return [...cell.getElementsByTagNameNS('*','t')].map(t=>t.textContent).join('');
  if(type==='b') return value==='1'?'TRUE':'FALSE';
  return value;
}

function columnIndex(ref) {
  const letters=(ref||'').replace(/\\d/g,'').toUpperCase(); let n=0;
  for(const ch of letters) n=n*26+ch.charCodeAt(0)-64;
  return Math.max(0,n-1);
}

function parseXlsxEntries(entries) {
  const parser=new DOMParser();
  const workbook=parser.parseFromString(entries['xl/workbook.xml']||'','application/xml');
  const rels=parser.parseFromString(entries['xl/_rels/workbook.xml.rels']||'','application/xml');
  const sharedDoc=entries['xl/sharedStrings.xml']?parser.parseFromString(entries['xl/sharedStrings.xml'],'application/xml'):null;
  const sharedStrings=sharedDoc?[...sharedDoc.getElementsByTagNameNS('*','si')].map(si=>[...si.getElementsByTagNameNS('*','t')].map(t=>t.textContent).join('')):[];
  const relMap={};
  [...rels.getElementsByTagNameNS('*','Relationship')].forEach(r=>{relMap[r.getAttribute('Id')]=r.getAttribute('Target');});
  const sheets=[...workbook.getElementsByTagNameNS('*','sheet')];
  return sheets.map((sheet)=>{
    const target=relMap[sheet.getAttribute('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')]||relMap[sheet.getAttribute('r:id')];
    const path=target?.startsWith('/')?target.slice(1):('xl/'+String(target||'').replace(/^\\.\\//,''));
    const doc=parser.parseFromString(entries[path]||'','application/xml');
    const rows=[...doc.getElementsByTagNameNS('*','row')].map(row=>{
      const cells=[];
      [...row.getElementsByTagNameNS('*','c')].forEach(cell=>{const ref=cell.getAttribute('r');cells[columnIndex(ref)]=xlsxCellValue(cell,sharedStrings);});
      return cells;
    });
    return {name:sheet.getAttribute('name')||'Sheet',rows};
  }).filter(s=>s.rows.length);
}

function createTextPdf(lines) {
  const encoder=new TextEncoder();
  const pageChunks=[]; for(let i=0;i<(lines.length?lines.length:1);i+=48) pageChunks.push((lines.length?lines:[['OrbitBoard']]).slice(i,i+48));
  const objects=[null];
  const addObj=s=>{objects.push(s);return objects.length-1;};
  const pagesId=2;
  addObj('<< /Type /Pages /Kids [PAGE_KIDS] /Count PAGE_COUNT >>');
  const fontId=addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageIds=[];
  const escape=s=>String(s??'').replace(/\\/g,'\\\\').replace(/\\(/g,'\\\\(').replace(/\\)/g,'\\\\)').replace(/[\\r\\n]+/g,' ');
  pageChunks.forEach(page=>{
    let stream='BT\\n/F1 9 Tf\\n40 800 Td\\n';
    page.forEach((line,idx)=>{if(idx) stream+='0 -15 Td\\n';stream+='('+escape(line)+') Tj\\n';});
    stream+='ET\\n';
    const contentId=addObj('<< /Length '+encoder.encode(stream).length+' >>\\nstream\\n'+stream+'endstream');
    const pageId=addObj('<< /Type /Page /Parent '+pagesId+' 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 '+fontId+' 0 R >> >> /Contents '+contentId+' 0 R >>');
    pageIds.push(pageId);
  });
  objects[pagesId]='<< /Type /Pages /Kids ['+pageIds.map(id=>id+' 0 R').join(' ')+'] /Count '+pageIds.length+' >>';
  const catalog='<< /Type /Catalog /Pages '+pagesId+' 0 R >>';
  objects[1]=catalog;
  const header=new Uint8Array([37,80,68,70,45,49,46,52,10,37,255,255,255,255,10]);
  const parts=[header], offsets=[0]; let pos=header.length;
  for(let i=1;i<objects.length;i++){
    const b=encoder.encode(i+' 0 obj\\n'), body=encoder.encode(objects[i]), e=encoder.encode('\\nendobj\\n');
    offsets[i]=pos; parts.push(b,body,e); pos+=b.length+body.length+e.length;
  }
  const xrefStart=pos; let xref='xref\\n0 '+objects.length+'\\n0000000000 65535 f \\n';
  for(let i=1;i<objects.length;i++) xref+=String(offsets[i]).padStart(10,'0')+' 00000 n \\n';
  xref+='trailer << /Size '+objects.length+' /Root 1 0 R >>\\nstartxref\\n'+xrefStart+'\\n%%EOF';
  parts.push(encoder.encode(xref));
  return new Blob(parts,{type:'application/pdf'});
}

function ImageResizer() {
  const [file,setFile]=useState(null),[width,setWidth]=useState('1200'),[height,setHeight]=useState(''),[quality,setQuality]=useState('0.9'),[format,setFormat]=useState('image/jpeg'),[preview,setPreview]=useState(''),[status,setStatus]=useState('');
  const resize=async()=>{
    if(!file){setStatus('Choose an image first.');return;}
    const url=URL.createObjectURL(file);
    try {
      const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=url;});
      const targetWidth=Math.max(1,Math.round(Number(width)||image.naturalWidth));
      const targetHeight=height?Math.max(1,Math.round(Number(height))):Math.max(1,Math.round(image.naturalHeight*targetWidth/image.naturalWidth));
      const canvas=document.createElement('canvas');canvas.width=targetWidth;canvas.height=targetHeight;
      const ctx=canvas.getContext('2d');if(format==='image/jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,targetWidth,targetHeight);}ctx.drawImage(image,0,0,targetWidth,targetHeight);
      const data=canvas.toDataURL(format,Number(quality));setPreview(data);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,format,Number(quality)));
      const ext=format==='image/png'?'png':format==='image/webp'?'webp':'jpg';
      downloadBlob(blob,(file.name.replace(/\.[^.]+$/,'')||'orbitboard-image')+'-'+targetWidth+'x'+targetHeight+'.'+ext);
      setStatus('Done — resized image downloaded.');
    } catch {setStatus('Could not resize this image.');} finally {URL.revokeObjectURL(url);}
  };
  return <div className="space-y-5">
    <label className="block"><span className="text-xs font-medium text-slate-400">Image</span><input type="file" accept="image/*" onChange={e=>{setFile(e.target.files?.[0]||null);setStatus('');}} className="mt-2 block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"/></label>
    <div className="grid sm:grid-cols-2 gap-4"><Field label="Width (px)" value={width} onChange={setWidth}/><Field label="Height (px, optional)" value={height} onChange={setHeight} placeholder="Auto from aspect ratio"/></div>
    <div className="grid sm:grid-cols-2 gap-4"><label className="block"><span className="text-xs font-medium text-slate-400">Output format</span><select value={format} onChange={e=>setFormat(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"><option value="image/jpeg">JPG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option></select></label><label className="block"><span className="text-xs font-medium text-slate-400">Quality: {Math.round(Number(quality)*100)}%</span><input type="range" min="0.5" max="1" step="0.01" value={quality} onChange={e=>setQuality(e.target.value)} className="mt-3 w-full"/></label></div>
    <button onClick={resize} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold">Resize & Download</button>
    {preview&&<img src={preview} alt="Resized preview" className="max-h-72 max-w-full rounded-2xl border border-slate-800 object-contain"/>}
    {status&&<p aria-live="polite" className="text-sm text-slate-400">{status}</p>}
    <p className="text-xs text-slate-500">Processed locally in your browser. Nothing is uploaded.</p>
  </div>
}

function SvgToPng() {
  const [input,setInput]=useState('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="#111827"/><text x="400" y="235" text-anchor="middle" font-family="Arial" font-size="42" fill="white">OrbitBoard</text></svg>');
  const [scale,setScale]=useState('1'),[preview,setPreview]=useState(''),[status,setStatus]=useState('');
  const convert=async()=>{
    try {
      const blob=new Blob([input],{type:'image/svg+xml'}),url=URL.createObjectURL(blob);
      const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=url;});
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*Number(scale)));canvas.height=Math.max(1,Math.round(image.naturalHeight*Number(scale)));
      canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/png');setPreview(data);
      const out=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));downloadBlob(out,'orbitboard-svg.png');setStatus('Done — PNG downloaded.');URL.revokeObjectURL(url);
    } catch {setStatus('Invalid SVG or conversion failed.');}
  };
  return <div className="space-y-5"><label className="block"><span className="text-xs font-medium text-slate-400">SVG markup</span><textarea value={input} onChange={e=>setInput(e.target.value)} className="mt-2 w-full h-48 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm"/></label><Field label="Scale" value={scale} onChange={setScale}/><button onClick={convert} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold">Convert to PNG</button>{preview&&<img src={preview} alt="SVG converted to PNG" className="max-h-72 max-w-full rounded-2xl border border-slate-800 object-contain"/>}{status&&<p aria-live="polite" className="text-sm text-slate-400">{status}</p>}<p className="text-xs text-slate-500">SVG is rendered locally in your browser.</p></div>
}

function CsvToPdf() {
  const [input,setInput]=useState('Name,Role,Status\nJohn Doe,Developer,Active\nMitra,Assistant,Active'),[status,setStatus]=useState('');
  const parseCsv=text=>text.split(/\r?\n/).filter(Boolean).map(line=>{const out=[];let cell='',quoted=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'&&line[i+1]==='"'){cell+='"';i++;continue;}if(ch==='"'){quoted=!quoted;continue;}if(ch===','&&!quoted){out.push(cell);cell='';}else cell+=ch;}out.push(cell);return out;});
  const convert=()=>{try{const rows=parseCsv(input);const lines=rows.map(r=>r.map(v=>v.trim()).join(' | '));downloadBlob(createTextPdf(lines),'orbitboard-csv.pdf');setStatus('Done — CSV data exported to PDF.');}catch{setStatus('Could not convert the CSV.');}};
  return <div className="space-y-5"><label className="block"><span className="text-xs font-medium text-slate-400">CSV data</span><textarea value={input} onChange={e=>setInput(e.target.value)} className="mt-2 w-full h-52 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm"/></label><button onClick={convert} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold">Convert CSV to PDF</button>{status&&<p aria-live="polite" className="text-sm text-slate-400">{status}</p>}<p className="text-xs text-slate-500">Creates a simple, readable PDF from CSV rows. Processing stays in your browser.</p></div>
}

function XlsxToPdf() {
  const [file,setFile]=useState(null),[status,setStatus]=useState('');
  const convert=async()=>{
    if(!file){setStatus('Choose an XLSX file first.');return;}
    setStatus('Reading workbook...');
    try {
      const entries=await unzipXlsxEntries(file), sheets=parseXlsxEntries(entries), lines=[];
      sheets.forEach(sheet=>{
        lines.push('Sheet: '+sheet.name);
        sheet.rows.slice(0,120).forEach(row=>{
          const values=row.map(v=>String(v??'').trim());
          while(values.length&&values[values.length-1]==='') values.pop();
          lines.push(values.join(' | ').slice(0,180));
        });
        lines.push('');
      });
      if(!lines.length) throw new Error('No readable worksheet data found');
      downloadBlob(createTextPdf(lines),'orbitboard-spreadsheet.pdf');
      setStatus('Done — a readable PDF table was generated. Basic cell values are preserved; Excel styling, formulas and charts are not.');
    } catch(e) { setStatus(e.message||'Could not convert this XLSX file.'); }
  };
  return <div className="space-y-5">
    <label className="block"><span className="text-xs font-medium text-slate-400">Excel workbook (.xlsx)</span><input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={e=>{setFile(e.target.files?.[0]||null);setStatus('');}} className="mt-2 block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"/></label>
    <button onClick={convert} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold hover:bg-violet-500">Convert XLSX to PDF</button>
    {status&&<p aria-live="polite" className="text-sm text-slate-400">{status}</p>}
    <p className="text-xs text-slate-500">Runs locally in your browser. This MVP exports readable cell values from workbook sheets; advanced Excel formatting is intentionally not reproduced.</p>
  </div>
}

function ImageToPdf() {
  const [file,setFile]=useState(null),[preview,setPreview]=useState(''),[status,setStatus]=useState('');
  const convert=async()=>{
    if(!file){setStatus('Choose an image first.');return;}
    setStatus('Generating PDF...');
    const url=URL.createObjectURL(file);
    try {
      const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=url;});
      const canvas=document.createElement('canvas'); canvas.width=image.naturalWidth; canvas.height=image.naturalHeight;
      const ctx=canvas.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(image,0,0);
      setPreview(canvas.toDataURL('image/jpeg',0.92));
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.92));
      const bytes=new Uint8Array(await blob.arrayBuffer());
      const pdf=createPdfFromJpeg(bytes,image.naturalWidth,image.naturalHeight);
      downloadBlob(pdf,(file.name.replace(/\\.[^.]+$/,'')||'orbitboard-image')+'.pdf');
      setStatus('Done — your PDF is ready.');
    } catch { setStatus('Could not generate the PDF. Try another image.'); }
    finally { URL.revokeObjectURL(url); }
  };
  return <div className="space-y-5">
    <label className="block"><span className="text-xs font-medium text-slate-400">Image file</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{setFile(e.target.files?.[0]||null);setStatus('');}} className="mt-2 block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"/></label>
    {preview&&<img src={preview} alt="PDF preview" className="max-h-72 max-w-full rounded-2xl border border-slate-800 object-contain"/>}
    <button onClick={convert} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold hover:bg-violet-500">Convert to PDF</button>
    {status&&<p aria-live="polite" className="text-sm text-slate-400">{status}</p>}
    <p className="text-xs text-slate-500">Generated locally in your browser. No upload or server processing.</p>
  </div>
}

function Percentage() { const [value,setValue]=useState('100'),[pct,setPct]=useState('20'); const amount=num(value)*num(pct)/100; return <><Field label="Base value" value={value} onChange={setValue}/><Field label="Percentage" value={pct} onChange={setPct}/><Result label="Percentage amount" value={money(amount)}/><Result label="Value after increase" value={money(num(value)+amount)}/></> }
function Emi() { const [principal,setPrincipal]=useState('1000000'),[rate,setRate]=useState('9'),[years,setYears]=useState('5'); const p=num(principal),r=num(rate)/1200,n=Math.max(1,Math.round(num(years)*12)),emi=r?p*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1):p/n,total=emi*n; return <><Field label="Loan amount (₹)" value={principal} onChange={setPrincipal}/><Field label="Annual interest rate (%)" value={rate} onChange={setRate}/><Field label="Tenure (years)" value={years} onChange={setYears}/><Result label="Monthly EMI" value={`₹ ${money(emi)}`} highlight/><Result label="Total interest" value={`₹ ${money(total-p)}`}/><Result label="Total repayment" value={`₹ ${money(total)}`}/></> }

function Gst() {
  const [amount,setAmount]=useState('100000'),[rate,setRate]=useState('18'),[mode,setMode]=useState('exclusive');
  const base=num(amount), gst=mode==='exclusive'?base*num(rate)/100:base*num(rate)/(100+num(rate));
  const total=mode==='exclusive'?base+gst:base;
  const preGst=mode==='exclusive'?base:base-gst;
  return <div className="space-y-5">
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label={mode==='exclusive'?'Pre-GST amount (₹)':'GST-inclusive amount (₹)'} value={amount} onChange={setAmount}/>
      <label className="block"><span className="text-xs font-medium text-slate-400">GST rate</span><select value={rate} onChange={e=>setRate(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-violet-500"><option value="0">0% (Nil / Exempt)</option><option value="5">5% (Merit Rate)</option><option value="18">18% (Standard Rate)</option><option value="40">40% (Luxury / Sin Rate)</option><option value="3">3% (Special Rate)</option></select></label>
    </div>
    <label className="block"><span className="text-xs font-medium text-slate-400">Calculation mode</span><select value={mode} onChange={e=>setMode(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-violet-500"><option value="exclusive">Add GST to price</option><option value="inclusive">Extract GST from inclusive price</option></select></label>
    <div className="grid sm:grid-cols-2 gap-3">
      <Result label="Pre-GST value" value={`₹ ${money(preGst)}`} highlight/>
      <Result label="GST amount" value={`₹ ${money(gst)}`} highlight/>
      <Result label="Final / inclusive price" value={`₹ ${money(total)}`}/>
    </div>
    <p className="text-xs text-slate-500">Select the GST rate applicable to your transaction. The dropdown includes common/current rate options; specific goods or services can have different treatment, exemptions or conditions. This calculator does not determine taxability or the legally applicable rate.</p>
  </div>
}


function JsonFormatter() {
  const [input,setInput]=useState('{"name":"OrbitBoard","tools":["JSON","JWT"]}'); const [mode,setMode]=useState('format');
  let output='',error='';
  try { const parsed=JSON.parse(input); output=mode==='minify'?JSON.stringify(parsed):JSON.stringify(parsed,null,2); } catch(e){ error=e.message; }
  return <div className="space-y-4"><textarea value={input} onChange={e=>setInput(e.target.value)} className="w-full h-56 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm"/><div className="flex gap-2"><button onClick={()=>setMode('format')} className="rounded-xl bg-violet-600 px-4 py-2 text-sm">Format</button><button onClick={()=>setMode('minify')} className="rounded-xl border border-slate-700 px-4 py-2 text-sm">Minify</button></div>{error?<p className="text-sm text-red-400">Invalid JSON: {error}</p>:<textarea readOnly value={output} className="w-full h-56 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm"/><ExportActions content={output} filename="orbitboard-json.txt"/></div>
}
function JsonToCsv() {
  const [input,setInput]=useState('[{"name":"John Doe","role":"Developer"},{"name":"Mitra","role":"Assistant"}]'); let csv='',error='';
  try { const rows=JSON.parse(input); if(!Array.isArray(rows)) throw new Error('JSON must be an array of objects'); if(rows.some(r=>!r||typeof r!=='object'||Array.isArray(r))) throw new Error('Each item must be an object'); const keys=[...new Set(rows.flatMap(r=>Object.keys(r)))]; const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"'; csv=[keys.map(esc).join(','),...rows.map(r=>keys.map(k=>esc(typeof r[k]==='object'?JSON.stringify(r[k]):r[k])).join(','))].join('\n'); } catch(e){error=e.message;}
  return <div className="space-y-4"><textarea value={input} onChange={e=>setInput(e.target.value)} className="w-full h-56 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm"/>{error?<p className="text-sm text-red-400">{error}</p>:<textarea readOnly value={csv} className="w-full h-56 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm"/>}<ExportActions content={csv} filename="orbitboard-data.csv"/><p className="text-xs text-slate-500">Best for flat JSON arrays. Nested values are stored as JSON text.</p></div>
}
function Base64Tool() {
  const [input,setInput]=useState('Hello OrbitBoard'); const [mode,setMode]=useState('encode'); let output='',error='';
  try { output=mode==='encode'?btoa(unescape(encodeURIComponent(input))):decodeURIComponent(escape(atob(input))); } catch { error='Invalid Base64 input'; }
  return <div className="space-y-4"><textarea value={input} onChange={e=>setInput(e.target.value)} className="w-full h-40 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm"/><div className="flex gap-2"><button onClick={()=>setMode('encode')} className="rounded-xl bg-violet-600 px-4 py-2 text-sm">Encode</button><button onClick={()=>setMode('decode')} className="rounded-xl border border-slate-700 px-4 py-2 text-sm">Decode</button></div><textarea readOnly value={error||output} className="w-full h-40 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm"/><ExportActions content={error||output} filename="orbitboard-base64.txt"/></div>
}
function JwtDecoder() {
  const [token,setToken]=useState(''); let header='',payload='',error='';
  try { if(token.trim()){const p=token.split('.'); if(p.length!==3) throw new Error('A JWT must contain three parts'); const dec=s=>{const normalized=s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'='); return JSON.stringify(JSON.parse(decodeURIComponent(escape(atob(normalized)))),null,2)}; header=dec(p[0]);payload=dec(p[1]);} } catch(e){error='Invalid JWT: '+e.message;}
  return <div className="space-y-4"><textarea value={token} onChange={e=>setToken(e.target.value)} placeholder="Paste JWT here" className="w-full h-32 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm"/>{error&&<p className="text-sm text-red-400">{error}</p>}<div className="grid sm:grid-cols-2 gap-4"><textarea readOnly value={header} placeholder="Header" className="w-full h-52 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm"/><textarea readOnly value={payload} placeholder="Payload" className="w-full h-52 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm"/></div><p className="text-xs text-slate-500">Decoded locally in your browser. Signature verification is not performed.</p></div>
}
function UnixTimestamp() {
  const [ts,setTs]=useState(()=>String(Math.floor(Date.now()/1000))); const [date,setDate]=useState('');
  const parsed=Number(ts); const dateValue=new Date(parsed*1000); const readable=Number.isFinite(parsed)&&!Number.isNaN(dateValue.getTime())?dateValue.toISOString():'Invalid timestamp'; const fromDate=date?Math.floor(new Date(date).getTime()/1000):'';
  return <div className="space-y-4"><Field label="Unix timestamp (seconds)" value={ts} onChange={setTs}/><Result label="UTC date" value={readable} highlight/><label className="block"><span className="text-xs font-medium text-slate-400">Date/time to convert</span><input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"/></label>{date&&<Result label="Unix timestamp" value={String(fromDate)}/>}</div>
}
function UuidGenerator() {
  const [count,setCount]=useState('5'); const [ids,setIds]=useState(()=>Array.from({length:5},()=>crypto.randomUUID()));
  return <div className="space-y-4"><Field label="Number of UUIDs" value={count} onChange={setCount}/><button onClick={()=>setIds(Array.from({length:Math.min(50,Math.max(1,Math.floor(num(count))))},()=>crypto.randomUUID()))} className="rounded-xl bg-violet-600 px-4 py-2 text-sm">Generate UUIDs</button><textarea readOnly value={ids.join('\n')} className="w-full h-56 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm"/><ExportActions content={ids.join('\n')} filename="orbitboard-uuids.txt"/></div>
}
function UrlEncoder() {
  const [input,setInput]=useState('https://orbitboard.in/tools?name=John%20Doe'); const [mode,setMode]=useState('encode'); let output;
  try { output=mode==='encode'?encodeURIComponent(input):decodeURIComponent(input); } catch { output='Invalid encoded URL component'; }
  return <div className="space-y-4"><textarea value={input} onChange={e=>setInput(e.target.value)} className="w-full h-40 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm"/><div className="flex gap-2"><button onClick={()=>setMode('encode')} className="rounded-xl bg-violet-600 px-4 py-2 text-sm">Encode</button><button onClick={()=>setMode('decode')} className="rounded-xl border border-slate-700 px-4 py-2 text-sm">Decode</button></div><textarea readOnly value={output} className="w-full h-40 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm"/></div>
}

function Sip() {
  const [monthly,setMonthly]=useState('10000'),[rate,setRate]=useState('12'),[years,setYears]=useState('10');
  const p=num(monthly), r=num(rate)/1200, n=num(years)*12;
  const maturity=r>0?p*((Math.pow(1+r,n)-1)/r)*(1+r):p*n;
  const invested=p*n, returns=Math.max(0,maturity-invested);
  return <div className="space-y-5">
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label="Monthly SIP (₹)" value={monthly} onChange={setMonthly}/>
      <Field label="Expected annual return (%)" value={rate} onChange={setRate}/>
    </div>
    <Field label="Investment period (years)" value={years} onChange={setYears}/>
    <div className="grid sm:grid-cols-2 gap-3">
      <Result label="Estimated maturity value" value={`₹ ${money(maturity)}`} highlight/>
      <Result label="Total amount invested" value={`₹ ${money(invested)}`}/>
      <Result label="Estimated returns" value={`₹ ${money(returns)}`}/>
    </div>
    <p className="text-xs text-slate-500">Illustration only. Mutual fund returns are market-linked and not guaranteed. Actual results depend on investment performance, timing and expenses.</p>
  </div>
}

export default function ToolPage() {
  const {slug}=useParams(); const tool=TOOLS.find(t=>t.slug===slug); const info=TOOL_CONTENT[slug];
  const content=useMemo(()=>({ 'salary-hike':SalaryHike,'ctc-to-inhand':SalaryCalculator,'offer-comparison':Offer,'notice-period':Notice,'experience':Experience,'percentage':Percentage,'length-converter':()=> <Converter type="length"/>,'weight-converter':()=> <Converter type="weight"/>,'temperature-converter':TemperatureConverter,'time-converter':()=> <Converter type="time"/>, 'jpg-to-png':()=> <ImageConverter format="image/png"/>, 'png-to-jpg':()=> <ImageConverter format="image/jpeg"/>, 'webp-to-jpg':()=> <ImageConverter format="image/jpeg"/>, 'image-to-pdf':ImageToPdf, 'xlsx-to-pdf':XlsxToPdf, 'image-resizer':ImageResizer, 'svg-to-png':SvgToPng, 'csv-to-pdf':CsvToPdf, 'image-compressor':ImageCompressor, 'image-metadata-remover':ImageMetadataRemover, 'pdf-merge':PdfMerge, 'pdf-split':PdfSplit, 'pdf-extract-pages':PdfExtract, 'pdf-reorder':PdfReorder, 'pdf-workspace':PdfWorkspace, 'pdf-compressor':PdfCompressor, 'pdf-to-jpg':()=> <PdfToImages format="image/jpeg"/>, 'pdf-to-png':()=> <PdfToImages format="image/png"/>, 'emi':Emi,'gst':Gst,'sip':Sip,'json-formatter':JsonFormatter,'json-to-csv':JsonToCsv,'base64':Base64Tool,'jwt-decoder':JwtDecoder,'unix-timestamp':UnixTimestamp,'uuid-generator':UuidGenerator,'url-encoder':UrlEncoder }[slug]),[slug]);
  useEffect(()=>{if(tool){document.title=tool.name+' | Free Online Tool | OrbitBoard'; const desc=info?.intro||tool.description;
    const setMeta=(name,content)=>{let m=document.querySelector('meta[name="'+name+'"]');if(!m){m=document.createElement('meta');m.name=name;document.head.appendChild(m);}m.content=content;};
    setMeta('description',desc);
    let canonical=document.querySelector('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical);}canonical.href='https://orbitboard.in/tools/'+slug;
    let schema=document.getElementById('orbitboard-tool-schema');if(schema)schema.remove();schema=document.createElement('script');schema.id='orbitboard-tool-schema';schema.type='application/ld+json';schema.textContent=JSON.stringify({"@context":"https://schema.org","@type":"WebApplication","name":tool.name,"url":"https://orbitboard.in/tools/"+slug,"applicationCategory":tool.category==="Developer"?"DeveloperApplication":"BusinessApplication","operatingSystem":"Web","description":desc,"offers":{"@type":"Offer","price":"0","priceCurrency":"INR"}});document.head.appendChild(schema);
    window.scrollTo(0,0);}},[tool,info,slug]);
  if(!tool || !content) return <div className="min-h-screen bg-slate-950 text-white p-10"><Link to="/tools">← Tools</Link><h1 className="text-2xl font-bold mt-8">Tool not found</h1></div>;
  const Tool=content; const related=TOOLS.filter(t=>t.category===tool.category&&t.slug!==tool.slug).slice(0,3);
  const categoryIcons={Career:BriefcaseBusiness,Finance:Coins,Developer:Code2,Everyday:Calculator}; const CategoryIcon=categoryIcons[tool.category]||Calculator;
  return <div className="min-h-screen bg-slate-950 text-slate-100">
    <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur"><div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between"><Link to="/" aria-label="OrbitBoard home" className="text-lg font-black text-white">ORBIT<span className="text-violet-400">BOARD</span></Link><Link to="/tools" className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 rounded-lg px-3 py-2"><ArrowLeft size={16}/> All tools</Link></div></header>
    <main>
      <section className="border-b border-slate-800/70 bg-gradient-to-b from-slate-900 to-slate-950"><div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14"><div className="grid lg:grid-cols-[.9fr_1.1fr] gap-10 items-center"><div><div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300"><CategoryIcon size={14}/>{tool.category} tool</div><h1 className="text-3xl sm:text-5xl font-black tracking-tight mt-5">{tool.name}</h1><p className="mt-4 text-base sm:text-lg leading-8 text-slate-400">{info?.intro||tool.description}</p></div><div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 min-h-56 sm:min-h-72"><img src={visualFor(tool.category)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35"/><div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-950/60 to-transparent"/><div className="relative h-full min-h-56 sm:min-h-72 p-7 flex items-end"><div><p className="text-xs uppercase tracking-[.2em] text-violet-300">OrbitBoard</p><p className="mt-2 text-2xl font-bold text-white">Get the answer. Keep moving.</p></div></div></div></div></div></section>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid lg:grid-cols-[minmax(0,1fr)_300px] gap-10"><div>
        <section aria-labelledby="tool-heading" className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-8 shadow-2xl"><h2 id="tool-heading" className="sr-only">Interactive tool</h2><ToolPageActions tool={tool}/><Tool/></section>
        {info&&<section className="mt-10 grid md:grid-cols-2 gap-6"><article className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="text-xl font-bold">How to use it</h2><ol className="mt-5 space-y-4">{info.how.map((step,i)=><li key={step} className="flex gap-3 text-sm leading-6 text-slate-400"><span className="shrink-0 w-6 h-6 rounded-full bg-violet-500/15 text-violet-300 flex items-center justify-center text-xs font-bold">{i+1}</span>{step}</li>)}</ol></article><article className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="text-xl font-bold">Why use OrbitBoard?</h2><ul className="mt-5 space-y-4 text-sm leading-6 text-slate-400"><li className="flex gap-3"><CheckCircle2 className="shrink-0 text-emerald-400 mt-1" size={17}/>Free to use with no sign-up.</li><li className="flex gap-3"><CheckCircle2 className="shrink-0 text-emerald-400 mt-1" size={17}/>Designed for quick, practical answers.</li><li className="flex gap-3"><CheckCircle2 className="shrink-0 text-emerald-400 mt-1" size={17}/>Developer tools run in your browser.</li></ul></article></section>}
        {info?.faq?.length>0&&<section className="mt-10"><h2 className="text-2xl font-bold">Frequently asked questions</h2><div className="mt-5 space-y-3">{info.faq.map(([q,a])=><details key={q} className="group rounded-2xl border border-slate-800 bg-slate-900 p-5"><summary className="cursor-pointer font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 rounded">{q}</summary><p className="mt-3 text-sm leading-7 text-slate-400">{a}</p></details>)}</div></section>}
      </div><aside className="lg:pt-2"><div className="sticky top-24 rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs font-semibold uppercase tracking-wider text-violet-400">More {tool.category} tools</p><div className="mt-4 space-y-2">{related.map(r=><Link key={r.slug} to={`/tools/${r.slug}`} className="flex items-center justify-between rounded-xl px-3 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">{r.name}<ArrowRight size={15}/></Link>)}</div></div></aside></div>
    </main><footer className="border-t border-slate-900 py-10 text-center text-sm text-slate-600">OrbitBoard • Practical tools for work & life</footer>
  </div>
}
function ImageCompressor() {
  const [file,setFile]=useState(null),[quality,setQuality]=useState('0.72'),[format,setFormat]=useState('image/jpeg'),[status,setStatus]=useState(''),[before,setBefore]=useState(0),[after,setAfter]=useState(0);
  const compress=async()=>{
    if(!file){setStatus('Choose an image first.');return;}
    setBefore(file.size);
    const url=URL.createObjectURL(file);
    try {
      const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=url;});
      const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
      const ctx=canvas.getContext('2d');if(format==='image/jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);}ctx.drawImage(image,0,0);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,format,Number(quality)));setAfter(blob.size);
      const ext=format==='image/png'?'png':format==='image/webp'?'webp':'jpg';
      downloadBlob(blob,(file.name.replace(/\.[^.]+$/,'')||'orbitboard-image')+'-compressed.'+ext);setStatus('Done — compressed image downloaded.');
    } catch {setStatus('Could not compress this image.');} finally {URL.revokeObjectURL(url);}
  };
  const saved=before&&after?Math.max(0,Math.round((1-after/before)*100)):0;
  return <div className="space-y-5"><input type="file" accept="image/*" onChange={e=>{setFile(e.target.files?.[0]||null);setStatus('')}} className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"/><div className="grid sm:grid-cols-2 gap-4"><label className="block"><span className="text-xs font-medium text-slate-400">Output format</span><select value={format} onChange={e=>setFormat(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"><option value="image/jpeg">JPG</option><option value="image/webp">WebP</option><option value="image/png">PNG</option></select></label><label className="block"><span className="text-xs font-medium text-slate-400">Quality: {Math.round(Number(quality)*100)}%</span><input type="range" min="0.4" max="1" step="0.01" value={quality} onChange={e=>setQuality(e.target.value)} className="mt-3 w-full"/></label></div><button onClick={compress} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold">Compress & Download</button>{after>0&&<div className="grid sm:grid-cols-3 gap-3"><Result label="Original" value={(before/1024).toFixed(1)+' KB'}/><Result label="Compressed" value={(after/1024).toFixed(1)+' KB'}/><Result label="Size reduction" value={saved+'%'} highlight/></div>}{status&&<p aria-live="polite" className="text-sm text-slate-400">{status}</p>}<p className="text-xs text-slate-500">Re-encodes the image locally in your browser. Metadata may be removed during re-encoding.</p></div>
}

function DiffChecker() {
  const [left,setLeft]=useState(''),[right,setRight]=useState(''),[mode,setMode]=useState('lines');
  const leftLines=left.split(/\r?\n/), rightLines=right.split(/\r?\n/);
  const max=Math.max(leftLines.length,rightLines.length);
  const rows=Array.from({length:max},(_,i)=>({n:i+1,left:leftLines[i]??'',right:rightLines[i]??'',same:(leftLines[i]??'')===(rightLines[i]??'')}));
  const changed=rows.filter(r=>!r.same).length;
  const copy=async()=>{await navigator.clipboard.writeText(rows.filter(r=>!r.same).map(r=>`Line ${r.n}\n- ${r.left}\n+ ${r.right}`).join('\n\n'));};
  return <div className="space-y-5">
    <div className="grid lg:grid-cols-2 gap-4">
      <label className="block"><span className="text-xs font-medium text-slate-400">Original</span><textarea value={left} onChange={e=>setLeft(e.target.value)} placeholder="Paste original text…" className="mt-2 w-full h-72 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm"/></label>
      <label className="block"><span className="text-xs font-medium text-slate-400">Changed</span><textarea value={right} onChange={e=>setRight(e.target.value)} placeholder="Paste changed text…" className="mt-2 w-full h-72 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm"/></label>
    </div>
    <div className="flex flex-wrap items-center gap-2"><select value={mode} onChange={e=>setMode(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"><option value="lines">Line comparison</option></select><Result label="Changed lines" value={String(changed)} highlight/><button onClick={copy} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold">Copy changes</button></div>
    <div className="overflow-auto rounded-xl border border-slate-800"><table className="w-full text-left text-xs"><thead className="bg-slate-900 text-slate-400"><tr><th className="p-3 w-16">Line</th><th className="p-3">Original</th><th className="p-3">Changed</th></tr></thead><tbody>{rows.map(r=><tr key={r.n} className={r.same?'border-t border-slate-800/50':'border-t border-violet-500/20 bg-violet-500/5'}><td className="p-3 text-slate-500">{r.n}</td><td className="p-3 font-mono whitespace-pre-wrap break-all text-slate-300">{r.left}</td><td className="p-3 font-mono whitespace-pre-wrap break-all text-slate-300">{r.right}</td></tr>)}</tbody></table></div>
    <p className="text-xs text-slate-500">Compares pasted text locally in your browser. This version compares lines and does not upload your content.</p>
  </div>
}

function ImageMetadataRemover() {
  const [file,setFile]=useState(null),[format,setFormat]=useState('image/jpeg'),[status,setStatus]=useState('');
  const clean=async()=>{
    if(!file){setStatus('Choose an image first.');return;}
    const url=URL.createObjectURL(file);
    try {const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=url;});const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d');if(format==='image/jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);}ctx.drawImage(image,0,0);const blob=await new Promise(resolve=>canvas.toBlob(resolve,format,0.95));const ext=format==='image/png'?'png':format==='image/webp'?'webp':'jpg';downloadBlob(blob,(file.name.replace(/\.[^.]+$/,'')||'orbitboard-image')+'-clean.'+ext);setStatus('Done — re-encoded image downloaded.');}catch{setStatus('Could not process this image.')}finally{URL.revokeObjectURL(url);}
  };
  return <div className="space-y-5"><input type="file" accept="image/*" onChange={e=>{setFile(e.target.files?.[0]||null);setStatus('')}} className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"/><label className="block"><span className="text-xs font-medium text-slate-400">Output format</span><select value={format} onChange={e=>setFormat(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"><option value="image/jpeg">JPG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option></select></label><button onClick={clean} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold">Remove Metadata & Download</button>{status&&<p aria-live="polite" className="text-sm text-slate-400">{status}</p>}<p className="text-xs text-slate-500">The image is decoded and re-encoded locally; this can strip embedded metadata supported by the browser's image pipeline.</p></div>
}

function PdfMerge() {
  const [files,setFiles]=useState([]),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
  const merge=async()=>{if(files.length<2){setStatus('Choose at least two PDFs.');return;}setBusy(true);setStatus('Merging PDFs locally…');try{const bytes=await mergePdfFiles(files);downloadBlob(new Blob([bytes],{type:'application/pdf'}),'orbitboard-merged.pdf');setStatus('Done — merged PDF downloaded.');}catch(e){setStatus('Could not merge these PDFs. Some encrypted or malformed PDFs may not be supported.');}finally{setBusy(false);}};
  return <div className="space-y-5"><input type="file" accept="application/pdf" multiple onChange={e=>{setFiles([...e.target.files]);setStatus('')}} className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"/>{files.length>0&&<ol className="space-y-2">{files.map((f,i)=><li key={f.name+i} className="rounded-xl bg-slate-950 px-4 py-3 text-sm text-slate-300">{i+1}. {f.name}</li>)}</ol>}<button disabled={busy} onClick={merge} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">{busy?'Merging…':'Merge PDFs'}</button>{status&&<p aria-live="polite" className="text-sm text-slate-400">{status}</p>}<p className="text-xs text-slate-500">PDFs are processed locally in your browser.</p></div>
}

function PdfExtract() {
  const [file,setFile]=useState(null),[pages,setPages]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
  const extract=async()=>{if(!file){setStatus('Choose a PDF first.');return;}setBusy(true);try{const src=await loadPdf(file);const max=src.getPageCount();const indexes=pages.split(',').flatMap(part=>{const [a,b]=part.trim().split('-').map(Number);if(Number.isFinite(a)&&Number.isFinite(b)){const s=Math.min(a,b),e=Math.max(a,b);return Array.from({length:e-s+1},(_,i)=>s+i-1);}if(Number.isFinite(a))return [a-1];return [];}).filter(i=>i>=0&&i<max);if(!indexes.length){setStatus('Enter page numbers such as 1,3,5-7.');return;}const bytes=await extractPdfPages(file,indexes.map(i=>i+1));downloadBlob(new Blob([bytes],{type:'application/pdf'}),'orbitboard-extracted-pages.pdf');setStatus('Done — extracted PDF downloaded.');}catch{setStatus('Could not extract pages from this PDF.');}finally{setBusy(false);}};
  return <div className="space-y-5"><input type="file" accept="application/pdf" onChange={e=>{setFile(e.target.files?.[0]||null);setStatus('')}} className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"/><Field label="Pages" value={pages} onChange={setPages} type="text" placeholder="Example: 1,3,5-7"/><button disabled={busy} onClick={extract} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">{busy?'Extracting…':'Extract Pages'}</button>{status&&<p aria-live="polite" className="text-sm text-slate-400">{status}</p>}<p className="text-xs text-slate-500">Page selection uses the PDF's existing pages; no upload is required.</p></div>
}

function PdfSplit() {
  const [file,setFile]=useState(null),[status,setStatus]=useState('');
  const split=async()=>{if(!file){setStatus('Choose a PDF first.');return;}try{const bytesList=await splitPdfPages(file);bytesList.forEach((bytes,i)=>downloadBlob(new Blob([bytes],{type:'application/pdf'}),`page-${i+1}.pdf`));setStatus('Done — individual page PDFs downloaded.');}catch{setStatus('Could not split this PDF.');}};
  return <div className="space-y-5"><input type="file" accept="application/pdf" onChange={e=>{setFile(e.target.files?.[0]||null);setStatus('')}} className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"/><button onClick={split} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold">Split into Pages</button>{status&&<p aria-live="polite" className="text-sm text-slate-400">{status}</p>}<p className="text-xs text-slate-500">Each page is saved as a separate PDF in your browser.</p></div>
}

function PdfToImages({format='image/png'}) {
  const [file,setFile]=useState(null),[pages,setPages]=useState([]),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
  const load=async()=>{
    if(!file){setStatus('Choose a PDF first.');return;}
    setBusy(true);setStatus('Rendering pages…');
    try{
      const rendered=await renderPdfPages(file,{scale:1.25,format,quality:0.92});
      setPages(rendered);setStatus(rendered.length+' page(s) rendered.');
    }catch{setStatus('Could not render this PDF.');}finally{setBusy(false);}
  };
  const downloadAll=async()=>{for(const page of pages){const response=await fetch(page.data);downloadBlob(await response.blob(),`page-${page.number}.${format==='image/jpeg'?'jpg':'png'}`);}setStatus('Images downloaded.');};
  return <div className="space-y-5"><input type="file" accept="application/pdf" onChange={e=>{setFile(e.target.files?.[0]||null);setPages([]);setStatus('')}} className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"/><button disabled={busy} onClick={load} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">{busy?'Rendering…':'Render PDF Pages'}</button>{pages.length>0&&<><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{pages.map(p=><div key={p.number} className="rounded-2xl border border-slate-800 bg-slate-950 p-3"><img src={p.data} alt={'PDF page '+p.number} className="w-full rounded-lg bg-white"/><p className="mt-2 text-xs text-slate-400">Page {p.number}</p></div>)}</div><button onClick={downloadAll} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold">Download all pages</button></>}{status&&<p aria-live="polite" className="text-sm text-slate-400">{status}</p>}<p className="text-xs text-slate-500">PDF rendering and conversion happen locally in your browser.</p></div>
}

function PdfCompressor() {
  const [file,setFile]=useState(null),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[stats,setStats]=useState(null);
  const compress=async()=>{
    if(!file){setStatus('Choose a PDF first.');return;}setBusy(true);setStatus('Optimizing PDF structure…');
    try{const bytes=await optimizePdf(file);const blob=new Blob([bytes],{type:'application/pdf'});downloadBlob(blob,(file.name.replace(/\\.pdf$/i,'')||'orbitboard')+'-optimized.pdf');setStats({before:file.size,after:blob.size});setStatus('Done — optimized PDF downloaded.');}catch{setStatus('Could not optimize this PDF. Some encrypted or malformed PDFs may not be supported.');}finally{setBusy(false);}
  };
  const saved=stats?Math.round((1-stats.after/stats.before)*100):0;
  return <div className="space-y-5"><input type="file" accept="application/pdf" onChange={e=>{setFile(e.target.files?.[0]||null);setStats(null);setStatus('')}} className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"/><button disabled={busy} onClick={compress} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">{busy?'Optimizing…':'Optimize & Download'}</button>{stats&&<div className="grid sm:grid-cols-3 gap-3"><Result label="Original" value={(stats.before/1024).toFixed(1)+' KB'}/><Result label="Optimized" value={(stats.after/1024).toFixed(1)+' KB'}/><Result label="Size change" value={(saved>=0?saved+'% smaller':Math.abs(saved)+'% larger')} highlight/></div>}{status&&<p aria-live="polite" className="text-sm text-slate-400">{status}</p>}<p className="text-xs text-slate-500">This performs browser-side PDF structure optimization. It does not promise image recompression or a smaller file for every PDF.</p></div>
}

function PdfWorkspace() {
  const [file,setFile]=useState(null),[pages,setPages]=useState([]),[selected,setSelected]=useState(new Set()),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
  const renderPdf=async()=>{
    if(!file){setStatus('Choose a PDF first.');return;}setBusy(true);setStatus('Rendering PDF pages…');
    try{const rendered=await renderPdfPages(file,{scale:0.8,format:'image/jpeg',quality:0.82});
      setPages(rendered);setSelected(new Set());setStatus(rendered.length+' pages ready.');}catch{setStatus('Could not render this PDF.');}finally{setBusy(false);}
  };
  const toggle=n=>setSelected(prev=>{const next=new Set(prev);next.has(n)?next.delete(n):next.add(n);return next;});
  const rotate=n=>setPages(prev=>prev.map(p=>p.number===n?{...p,rotation:(p.rotation+90)%360}:p));
  const move=(n,dir)=>setPages(prev=>{const a=[...prev],i=a.findIndex(p=>p.number===n),j=i+dir;if(i<0||j<0||j>=a.length)return a;[a[i],a[j]]=[a[j],a[i]];return a;});
  const removeSelected=()=>{if(!selected.size){setStatus('Select pages to remove.');return;}setPages(prev=>prev.filter(p=>!selected.has(p.number)));setSelected(new Set());setStatus('Selected pages removed from the workspace.');};
  const exportPdf=async()=>{if(!file||!pages.length){setStatus('No pages available.');return;}setBusy(true);try{const bytes=await createEditedPdf(file,pages);downloadBlob(new Blob([bytes],{type:'application/pdf'}),'orbitboard-edited.pdf');setStatus('Done — edited PDF downloaded.');}catch{setStatus('Could not export this PDF.');}finally{setBusy(false);}};
  return <div className="space-y-5"><div className="flex flex-wrap gap-2"><input type="file" accept="application/pdf" onChange={e=>{setFile(e.target.files?.[0]||null);setPages([]);setStatus('')}} className="flex-1 min-w-60 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"/><button disabled={busy} onClick={renderPdf} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">{busy?'Working…':'Open PDF'}</button></div>
    {pages.length>0&&<><div className="flex flex-wrap gap-2"><button onClick={()=>setSelected(new Set(pages.map(p=>p.number)))} className="rounded-lg border border-slate-700 px-3 py-2 text-xs">Select all</button><button onClick={()=>setSelected(new Set())} className="rounded-lg border border-slate-700 px-3 py-2 text-xs">Clear</button><button onClick={removeSelected} className="rounded-lg border border-red-900/60 px-3 py-2 text-xs text-red-300">Delete selected</button><button disabled={busy} onClick={exportPdf} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold disabled:opacity-50">Export PDF</button></div>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">{pages.map((p,i)=><div key={p.number} className={`rounded-2xl border p-3 ${selected.has(p.number)?'border-violet-500 bg-violet-500/10':'border-slate-800 bg-slate-950'}`}><button onClick={()=>toggle(p.number)} className="block w-full text-left"><img src={p.data} alt={'Page '+p.number} className="w-full rounded-lg bg-white" style={{transform:`rotate(${p.rotation}deg)`}}/><p className="mt-2 text-xs text-slate-400">Page {p.number}{selected.has(p.number)?' • selected':''}</p></button><div className="mt-2 flex gap-1"><button onClick={()=>move(p.number,-1)} className="flex-1 rounded-lg border border-slate-800 py-1 text-xs">←</button><button onClick={()=>rotate(p.number)} className="flex-1 rounded-lg border border-slate-800 py-1 text-xs">↻</button><button onClick={()=>move(p.number,1)} className="flex-1 rounded-lg border border-slate-800 py-1 text-xs">→</button></div></div>)}</div></>}
    {status&&<p aria-live="polite" className="text-sm text-slate-400">{status}</p>}<p className="text-xs text-slate-500">Pages are rendered and edited locally in your browser. Export uses the original PDF pages.</p></div>
}

function PdfReorder() {
  const [file,setFile]=useState(null),[order,setOrder]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
  const load=async()=>{if(!file){setStatus('Choose a PDF first.');return;}try{const src=await loadPdf(file);setOrder(Array.from({length:src.getPageCount()},(_,i)=>i+1).join(','));setStatus(src.getPageCount()+' pages loaded. Enter the desired order.');}catch{setStatus('Could not read this PDF.');}};
  const reorder=async()=>{if(!file){setStatus('Choose a PDF first.');return;}setBusy(true);try{const src=await loadPdf(file);const nums=order.split(',').map(v=>Number(v.trim())).filter(Number.isInteger);if(nums.length!==src.getPageCount()||nums.some(n=>n<1||n>src.getPageCount())){setStatus('Enter every page exactly once, for example 3,1,2,4.');return;}const bytes=await reorderPdfPages(file,nums);downloadBlob(new Blob([bytes],{type:'application/pdf'}),'orbitboard-reordered.pdf');setStatus('Done — reordered PDF downloaded.');}catch{setStatus('Could not reorder this PDF.');}finally{setBusy(false);}};
  return <div className="space-y-5"><div className="flex gap-2"><input type="file" accept="application/pdf" onChange={e=>{setFile(e.target.files?.[0]||null);setStatus('')}} className="block flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"/><button onClick={load} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold">Load</button></div><Field label="Page order" value={order} onChange={setOrder} type="text" placeholder="Example: 3,1,2,4"/><button disabled={busy} onClick={reorder} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">{busy?'Saving…':'Reorder & Download'}</button>{status&&<p aria-live="polite" className="text-sm text-slate-400">{status}</p>}<p className="text-xs text-slate-500">Reordering runs locally. Page previews require a separate PDF rendering engine and are intentionally not faked.</p></div>
}

function ToolPageActions({tool}) {
  const [shared,setShared]=useState(false);
  const share=async()=>{
    const data={title:tool.name,text:'Try '+tool.name+' on OrbitBoard',url:window.location.href};
    try {
      if(navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(window.location.href); setShared(true); setTimeout(()=>setShared(false),1600); }
    } catch {}
  };
  const reset=()=>window.location.reload();
  return <div className="mb-5 flex flex-wrap gap-2">
    <button onClick={share} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-slate-600 hover:text-white">{shared?'Link copied':'Share tool'}</button>
    <button onClick={reset} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-slate-600 hover:text-white">Reset</button>
  </div>
}

function visualFor(category) { const images={Career:'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80',Finance:'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80',Developer:'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80',Everyday:'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80'}; return images[category]||images.Everyday; }