import {useEffect,useId,useState} from 'react';
import geo from 'countrycitystatejson/countries';
import {GST_STATE_CODES} from './gstIdentity.js';
const aliases={'Andaman and Nicobar Islands':'Andaman & Nicobar Islands','Jammu and Kashmir':'Jammu & Kashmir','Pondicherry':'Puducherry','Dadra and Nagar Haveli':'Dadra and Nagar Haveli and Daman and Diu'};
export function AddressFields({title,value,onChange,foreign=false,seller=false}){
 const id=useId(),[cityResult,setCities]=useState({key:'',rows:[]});const countries=geo.getCountries().map(c=>({...c,isoCode:c.shortName}));
 const country=value.country||'IN';
 const sourceStates=geo.getStatesByShort(country)||[];
 const states=country==='IN'?Object.keys(GST_STATE_CODES).filter(n=>!['Daman & Diu','Dadra & Nagar Haveli'].includes(n)).map(name=>({name})):sourceStates.map(name=>({name}));
 const selected=sourceStates.find(name=>(aliases[name]||name)===value.state);
 const stateIso=selected,cityKey=country+':'+(stateIso||'');
 const cities=cityResult.key===cityKey?cityResult.rows:[];
 useEffect(()=>{let live=true;if(stateIso)import('countrycitystatejson/client').then(async({default:data})=>{const rows=await data.getCities(country,stateIso);if(live)setCities({key:country+':'+stateIso,rows:rows||[]});}).catch(()=>{if(live)setCities({key:country+':'+stateIso,rows:[]});});return()=>{live=false;};},[country,stateIso]);
 const field=(key,label,type='text')=><label className="block text-xs">{title} {label}<input aria-label={`${title} ${label}`} className="orbit-control w-full" type={type} value={value[key]||''} onChange={e=>onChange({...value,[key]:key==='gstin'?e.target.value.toUpperCase():e.target.value})}/></label>;
 return <fieldset className="invoice-address"><legend>{title}</legend>
 {field(seller?'companyName':'name',seller?'Business name':'Name')}
 {field('address','Address line 1')}{field('address2','Address line 2 (optional)')}
 {foreign?<label className="block text-xs">{title} Country<input aria-label={`${title} Country`} list={`${id}-countries`} className="orbit-control w-full" value={value.countryName||''} onChange={e=>{const c=countries.find(c=>c.name.toLowerCase()===e.target.value.toLowerCase());onChange({...value,countryName:e.target.value,country:c?.isoCode||'',state:'',city:'',pin:''});}}/><datalist id={`${id}-countries`}>{countries.filter(c=>c.isoCode!=='IN').map(c=><option key={c.isoCode} value={c.name}/>)}</datalist></label>:<p className="text-xs">Country: India</p>}
 <label className="block text-xs">{title} State / province<input aria-label={`${title} State / province`} className="orbit-control w-full" list={`${id}-states`} value={value.state||''} onChange={e=>onChange({...value,state:e.target.value,city:''})}/><datalist id={`${id}-states`}>{states.map(s=><option key={s.name} value={aliases[s.name]||s.name}/>)}</datalist></label>
 <label className="block text-xs">{title} City<input aria-label={`${title} City`} list={`${id}-cities`} className="orbit-control w-full" value={value.city||''} onChange={e=>onChange({...value,city:e.target.value})}/><datalist id={`${id}-cities`}>{cities.map((c,index)=><option key={index} value={c}/>)}</datalist></label>
 {!cities.length&&<p className="text-xs">City suggestions may be unavailable for this locality; manual entry is supported.</p>}
 {field('pin',foreign?'Postal code':'PIN')}{field('phone','Phone','tel')}{field('email','Email','email')}
 {foreign?field('taxId','Tax ID / VAT'):field('gstin','GSTIN')}
 </fieldset>;
}
