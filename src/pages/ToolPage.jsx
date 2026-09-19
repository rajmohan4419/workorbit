import { Link, useParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { TOOLS } from '../data/tools';

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
function Notice() { const [date,setDate]=useState(new Date().toISOString().slice(0,10)),[days,setDays]=useState('60'); const d=new Date(date); d.setDate(d.getDate()+num(days)); return <><Field label="Resignation date" value={date} onChange={setDate} type="date"/><Field label="Notice period (days)" value={days} onChange={setDays}/><Result label="Calculated last working date" value={d.toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})} highlight/><p className="text-xs text-slate-500">Company policy and whether the resignation day counts can change the actual date by a day.</p></> }
function Experience() { const [from,setFrom]=useState('2012-01-01'),[to,setTo]=useState(new Date().toISOString().slice(0,10)); const d=Math.max(0,(new Date(to)-new Date(from))/86400000),years=Math.floor(d/365.2425),months=Math.floor((d-years*365.2425)/30.44); return <><Field label="Start date" value={from} onChange={setFrom} type="date"/><Field label="End date" value={to} onChange={setTo} type="date"/><Result label="Approximate experience" value={`${years} years ${months} months`} highlight/></> }
function Percentage() { const [value,setValue]=useState('100'),[pct,setPct]=useState('20'); const amount=num(value)*num(pct)/100; return <><Field label="Base value" value={value} onChange={setValue}/><Field label="Percentage" value={pct} onChange={setPct}/><Result label="Percentage amount" value={money(amount)}/><Result label="Value after increase" value={money(num(value)+amount)}/></> }
function Emi() { const [principal,setPrincipal]=useState('1000000'),[rate,setRate]=useState('9'),[years,setYears]=useState('5'); const p=num(principal),r=num(rate)/1200,n=num(years)*12,emi=r?p*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1):p/n,total=emi*n; return <><Field label="Loan amount (₹)" value={principal} onChange={setPrincipal}/><Field label="Annual interest rate (%)" value={rate} onChange={setRate}/><Field label="Tenure (years)" value={years} onChange={setYears}/><Result label="Monthly EMI" value={`₹ ${money(emi)}`} highlight/><Result label="Total interest" value={`₹ ${money(total-p)}`}/><Result label="Total repayment" value={`₹ ${money(total)}`}/></> }

function Gst() {
  const [amount,setAmount]=useState('100000'),[rate,setRate]=useState('18'),[mode,setMode]=useState('exclusive');
  const base=num(amount), gst=mode==='exclusive'?base*num(rate)/100:base*num(rate)/(100+num(rate));
  const total=mode==='exclusive'?base+gst:base;
  const preGst=mode==='exclusive'?base:base-gst;
  return <div className="space-y-5">
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label={mode==='exclusive'?'Pre-GST amount (₹)':'GST-inclusive amount (₹)'} value={amount} onChange={setAmount}/>
      <Field label="GST rate (%)" value={rate} onChange={setRate}/>
    </div>
    <label className="block"><span className="text-xs font-medium text-slate-400">Calculation mode</span><select value={mode} onChange={e=>setMode(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-violet-500"><option value="exclusive">Add GST to price</option><option value="inclusive">Extract GST from inclusive price</option></select></label>
    <div className="grid sm:grid-cols-2 gap-3">
      <Result label="Pre-GST value" value={`₹ ${money(preGst)}`} highlight/>
      <Result label="GST amount" value={`₹ ${money(gst)}`} highlight/>
      <Result label="Final / inclusive price" value={`₹ ${money(total)}`}/>
    </div>
    <p className="text-xs text-slate-500">Select the GST rate applicable to your transaction. This calculator does not determine taxability or the applicable rate.</p>
  </div>
}


function JsonFormatter() {
  const [input,setInput]=useState('{"name":"OrbitBoard","tools":["JSON","JWT"]}'); const [mode,setMode]=useState('format');
  let output='',error='';
  try { const parsed=JSON.parse(input); output=mode==='minify'?JSON.stringify(parsed):JSON.stringify(parsed,null,2); } catch(e){ error=e.message; }
  return <div className="space-y-4"><textarea value={input} onChange={e=>setInput(e.target.value)} className="w-full h-56 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm"/><div className="flex gap-2"><button onClick={()=>setMode('format')} className="rounded-xl bg-violet-600 px-4 py-2 text-sm">Format</button><button onClick={()=>setMode('minify')} className="rounded-xl border border-slate-700 px-4 py-2 text-sm">Minify</button></div>{error?<p className="text-sm text-red-400">Invalid JSON: {error}</p>:<textarea readOnly value={output} className="w-full h-56 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm"/>}</div>
}
function JsonToCsv() {
  const [input,setInput]=useState('[{"name":"Mohan","role":"Developer"},{"name":"Mitra","role":"Assistant"}]'); let csv='',error='';
  try { const rows=JSON.parse(input); if(!Array.isArray(rows)) throw new Error('JSON must be an array of objects'); const keys=[...new Set(rows.flatMap(r=>Object.keys(r)))]; const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"'; csv=[keys.map(esc).join(','),...rows.map(r=>keys.map(k=>esc(typeof r[k]==='object'?JSON.stringify(r[k]):r[k])).join(','))].join('\n'); } catch(e){error=e.message;}
  return <div className="space-y-4"><textarea value={input} onChange={e=>setInput(e.target.value)} className="w-full h-56 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm"/>{error?<p className="text-sm text-red-400">{error}</p>:<textarea readOnly value={csv} className="w-full h-56 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm"/>}<p className="text-xs text-slate-500">Best for flat JSON arrays. Nested values are stored as JSON text.</p></div>
}
function Base64Tool() {
  const [input,setInput]=useState('Hello OrbitBoard'); const [mode,setMode]=useState('encode'); let output='',error='';
  try { output=mode==='encode'?btoa(unescape(encodeURIComponent(input))):decodeURIComponent(escape(atob(input))); } catch { error='Invalid Base64 input'; }
  return <div className="space-y-4"><textarea value={input} onChange={e=>setInput(e.target.value)} className="w-full h-40 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm"/><div className="flex gap-2"><button onClick={()=>setMode('encode')} className="rounded-xl bg-violet-600 px-4 py-2 text-sm">Encode</button><button onClick={()=>setMode('decode')} className="rounded-xl border border-slate-700 px-4 py-2 text-sm">Decode</button></div><textarea readOnly value={error||output} className="w-full h-40 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm"/></div>
}
function JwtDecoder() {
  const [token,setToken]=useState(''); let header='',payload='',error='';
  try { if(token.trim()){const p=token.split('.'); if(p.length!==3) throw new Error('A JWT must contain three parts'); const dec=s=>JSON.stringify(JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g,'+').replace(/_/g,'/'))))),null,2); header=dec(p[0]);payload=dec(p[1]);} } catch(e){error='Invalid JWT: '+e.message;}
  return <div className="space-y-4"><textarea value={token} onChange={e=>setToken(e.target.value)} placeholder="Paste JWT here" className="w-full h-32 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm"/>{error&&<p className="text-sm text-red-400">{error}</p>}<div className="grid sm:grid-cols-2 gap-4"><textarea readOnly value={header} placeholder="Header" className="w-full h-52 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm"/><textarea readOnly value={payload} placeholder="Payload" className="w-full h-52 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm"/></div><p className="text-xs text-slate-500">Decoded locally in your browser. Signature verification is not performed.</p></div>
}
function UnixTimestamp() {
  const [ts,setTs]=useState(String(Math.floor(Date.now()/1000))); const [date,setDate]=useState('');
  const parsed=Number(ts); const readable=Number.isFinite(parsed)?new Date(parsed*1000).toISOString():'Invalid timestamp'; const fromDate=date?Math.floor(new Date(date).getTime()/1000):'';
  return <div className="space-y-4"><Field label="Unix timestamp (seconds)" value={ts} onChange={setTs}/><Result label="UTC date" value={readable} highlight/><label className="block"><span className="text-xs font-medium text-slate-400">Date/time to convert</span><input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"/></label>{date&&<Result label="Unix timestamp" value={String(fromDate)}/>}</div>
}
function UuidGenerator() {
  const [count,setCount]=useState('5'); const [ids,setIds]=useState(()=>Array.from({length:5},()=>crypto.randomUUID()));
  return <div className="space-y-4"><Field label="Number of UUIDs" value={count} onChange={setCount}/><button onClick={()=>setIds(Array.from({length:Math.min(50,Math.max(1,Math.floor(num(count))))},()=>crypto.randomUUID()))} className="rounded-xl bg-violet-600 px-4 py-2 text-sm">Generate UUIDs</button><textarea readOnly value={ids.join('\n')} className="w-full h-56 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm"/></div>
}
function UrlEncoder() {
  const [input,setInput]=useState('https://orbitboard.in/tools?name=Mohan Raj'); const [mode,setMode]=useState('encode'); let output='';
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
  const {slug}=useParams(); const tool=TOOLS.find(t=>t.slug===slug);
  const content=useMemo(()=>({ 'salary-hike':SalaryHike,'ctc-to-inhand':SalaryCalculator,'offer-comparison':Offer,'notice-period':Notice,'experience':Experience,'percentage':Percentage,'emi':Emi,'gst':Gst,'sip':Sip,'json-formatter':JsonFormatter,'json-to-csv':JsonToCsv,'base64':Base64Tool,'jwt-decoder':JwtDecoder,'unix-timestamp':UnixTimestamp,'uuid-generator':UuidGenerator,'url-encoder':UrlEncoder }[slug]),[slug]);
  if(!tool || !content) return <div className="min-h-screen bg-slate-950 text-white p-10"><Link to="/tools">← Tools</Link><h1 className="text-2xl font-bold mt-8">Tool not found</h1></div>;
  const Tool=content;
  return <div className="min-h-screen bg-slate-950 text-slate-100">
    <header className="border-b border-slate-800/80"><div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between"><Link to="/tools" className="text-sm text-violet-400">← All tools</Link><span className="text-xs text-slate-500">OrbitBoard</span></div></header>
    <main className="max-w-3xl mx-auto px-4 py-12"><p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">{tool.category}</p><h1 className="text-3xl sm:text-4xl font-black mt-2">{tool.name}</h1><p className="text-slate-400 mt-3">{tool.description}</p><div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8"><Tool/></div>
      <section className="mt-10 text-sm leading-7 text-slate-400"><h2 className="text-lg font-bold text-slate-200 mb-2">About this calculator</h2><p>OrbitBoard tools are built for quick, transparent estimates. Verify important payroll and tax figures against your payslip, employer policy and official tax guidance.</p></section>
    </main>
  </div>
}