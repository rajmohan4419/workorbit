import { Link, useParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { TOOLS } from '../data/tools';

const money = n => Number.isFinite(n) ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n) : '—';
const daysBetween = (a,b) => Math.ceil((new Date(b)-new Date(a))/86400000);

function Field({label, value, onChange, type='number', placeholder}) {
  return <label className="block"><span className="text-xs font-medium text-slate-400">{label}</span><input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-violet-500"/></label>
}

function SalaryHike() {
  const [old,setOld]=useState('1000000'), [next,setNext]=useState('1200000');
  const o=+old,n=+next,h=o?((n-o)/o)*100:0;
  return <><Field label="Current annual salary (₹)" value={old} onChange={setOld}/><Field label="New annual salary (₹)" value={next} onChange={setNext}/><Result label="Hike" value={`${h.toFixed(2)}%`}/><Result label="Increase" value={`₹ ${money(n-o)} / year`}/></>
}
function Ctc() {
  const [ctc,setCtc]=useState('1000000'), [ded,setDed]=useState('150000');
  const annual=Math.max(0,+ctc-+ded), monthly=annual/12;
  return <><Field label="Annual CTC (₹)" value={ctc} onChange={setCtc}/><Field label="Annual deductions / variable excluded (₹)" value={ded} onChange={setDed}/><Result label="Estimated annual take-home" value={`₹ ${money(annual)}`}/><Result label="Estimated monthly take-home" value={`₹ ${money(monthly)}`}/><p className="text-xs text-slate-500 mt-4">This is a simple estimator, not a tax calculation. Actual take-home depends on tax regime, PF, professional tax, variable pay and employer structure.</p></>
}
function Offer() {
  const [a,setA]=useState('1000000'),[b,setB]=useState('1300000');
  const diff=+b-+a;
  return <><Field label="Offer A CTC (₹)" value={a} onChange={setA}/><Field label="Offer B CTC (₹)" value={b} onChange={setB}/><Result label="Annual difference" value={`₹ ${money(diff)}`}/><Result label="Percentage difference" value={`${(+a?diff/+a*100:0).toFixed(2)}%`}/></>
}
function Notice() {
  const [date,setDate]=useState(new Date().toISOString().slice(0,10)),[days,setDays]=useState('60');
  const d=new Date(date); d.setDate(d.getDate()+Number(days||0));
  return <><Field label="Resignation date" value={date} onChange={setDate} type="date"/><Field label="Notice period (days)" value={days} onChange={setDays}/><Result label="Calculated last working date" value={d.toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}/><p className="text-xs text-slate-500 mt-4">Company policy and whether the resignation day counts can change the actual date by a day.</p></>
}
function Experience() {
  const [from,setFrom]=useState('2012-01-01'),[to,setTo]=useState(new Date().toISOString().slice(0,10));
  const d=Math.max(0,daysBetween(from,to)), years=Math.floor(d/365.2425), months=Math.floor((d-years*365.2425)/30.44);
  return <><Field label="Start date" value={from} onChange={setFrom} type="date"/><Field label="End date" value={to} onChange={setTo} type="date"/><Result label="Approximate experience" value={`${years} years ${months} months`}/></>
}
function Percentage() {
  const [value,setValue]=useState('100'),[pct,setPct]=useState('20');
  const increase=+value*(1+(+pct/100)), change=+value*(+pct/100);
  return <><Field label="Base value" value={value} onChange={setValue}/><Field label="Percentage" value={pct} onChange={setPct}/><Result label="Percentage amount" value={money(change)}/><Result label="Value after increase" value={money(increase)}/></>
}
function Emi() {
  const [principal,setPrincipal]=useState('1000000'),[rate,setRate]=useState('9'),[years,setYears]=useState('5');
  const p=+principal,r=+rate/1200,n=+years*12, emi=r?+principal*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1):+principal/n,total=emi*n;
  return <><Field label="Loan amount (₹)" value={principal} onChange={setPrincipal}/><Field label="Annual interest rate (%)" value={rate} onChange={setRate}/><Field label="Tenure (years)" value={years} onChange={setYears}/><Result label="Monthly EMI" value={`₹ ${money(emi)}`}/><Result label="Total interest" value={`₹ ${money(total-+principal)}`}/><Result label="Total repayment" value={`₹ ${money(total)}`}/></>
}
function Result({label,value}) { return <div className="mt-4 rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 flex items-center justify-between"><span className="text-xs text-slate-400">{label}</span><strong className="text-sm text-white">{value}</strong></div> }

export default function ToolPage() {
  const {slug}=useParams(); const tool=TOOLS.find(t=>t.slug===slug);
  const content=useMemo(()=>({ 'salary-hike':SalaryHike,'ctc-to-inhand':Ctc,'offer-comparison':Offer,'notice-period':Notice,'experience':Experience,'percentage':Percentage,'emi':Emi }[slug]),[slug]);
  if(!tool || !content) return <div className="min-h-screen bg-slate-950 text-white p-10"><Link to="/tools">← Tools</Link><h1 className="text-2xl font-bold mt-8">Tool not found</h1></div>;
  const Tool=content;
  return <div className="min-h-screen bg-slate-950 text-slate-100">
    <header className="border-b border-slate-800/80"><div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between"><Link to="/tools" className="text-sm text-violet-400">← All tools</Link><span className="text-xs text-slate-500">OrbitBoard</span></div></header>
    <main className="max-w-3xl mx-auto px-4 py-12"><p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">{tool.category}</p><h1 className="text-3xl sm:text-4xl font-black mt-2">{tool.name}</h1><p className="text-slate-400 mt-3">{tool.description}</p>
      <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 space-y-4"><Tool/></div>
      <section className="mt-10 text-sm leading-7 text-slate-400"><h2 className="text-lg font-bold text-slate-200 mb-2">About this calculator</h2><p>OrbitBoard tools are designed for quick estimates and everyday decisions. Always verify important financial, employment or payroll figures against official documents and applicable policies.</p></section>
    </main>
  </div>
}
