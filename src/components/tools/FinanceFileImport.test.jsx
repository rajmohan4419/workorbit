// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {FinanceFileImport} from './FinanceFileImport.jsx';
import * as importer from '../../engines/financeImport.js';
import {normalizeTransaction} from '../../engines/bankReconciliationEngine.js';
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const fields=[{key:'date',label:'Date',required:true},{key:'amount',label:'Amount',required:true}];
const detect=()=>({date:'Date',amount:'Amount'});
const validate=(r,i)=>{const {error}=normalizeTransaction(r,{date:'date',amount:'amount'},'bank',i);return error?[{rowNumber:r.__sourceRow,message:error}]:[];};
let root,container,commit,read;
beforeEach(async()=>{
 container=document.createElement('div');document.body.append(container);root=createRoot(container);commit=vi.fn();read=vi.spyOn(importer,'readFinanceFile');
 await act(async()=>root.render(<FinanceFileImport title="Bank" fields={fields} detect={detect} validate={validate} onCommit={commit} onClear={()=>{}} activeLabel="Existing source" sample={[]}/>));
});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();vi.restoreAllMocks();});
async function upload(rows){read.mockResolvedValue({jsonRows:rows,sheetNames:['Data']});const input=container.querySelector('input[type=file]');Object.defineProperty(input,'files',{configurable:true,value:[{name:'synthetic.csv'}]});await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));}
const button=()=>[...container.querySelectorAll('button')].find(b=>b.textContent==='Confirm mapping and use source');
it('requires date review and commits only once under repeated synchronous clicks',async()=>{
 await upload([{Date:'04/05/2026',Amount:'1,23,456.785',__sourceRow:2}]);
 expect(button().disabled).toBe(true);expect(container.textContent).toContain('Ambiguous date');
 const selector=container.querySelector('[aria-label="Bank date convention"]');await act(async()=>{selector.value='dmy';selector.dispatchEvent(new Event('change',{bubbles:true}));});
 expect(button().disabled).toBe(false);
 const confirm=button();await act(async()=>{confirm.click();confirm.click();});
 expect(commit).toHaveBeenCalledOnce();expect(commit.mock.calls[0][0].rows[0].date).toBe('2026-05-04');
});
it('blocks all duplicate rows and invalid values before activation',async()=>{
 await upload([{Date:'2026-05-04',Amount:'100',__sourceRow:2},{Date:'2026-05-04',Amount:'100',__sourceRow:3}]);
 expect(container.textContent).toContain('Duplicate mapped row');expect(button().disabled).toBe(true);expect(commit).not.toHaveBeenCalled();
 await upload([{Date:'2026-02-30',Amount:'12oops',__sourceRow:2}]);expect(button().disabled).toBe(true);expect(container.textContent).toContain('Existing source');
});
it('clears busy state after parser rejection and permits retry without clearing active data',async()=>{
 read.mockRejectedValue(new Error('Spreadsheet processing exceeded 15 seconds.'));
 const input=container.querySelector('input[type=file]');Object.defineProperty(input,'files',{configurable:true,value:[{name:'stalled.xlsx'}]});
 await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));
 expect(input.disabled).toBe(false);expect(container.textContent).toContain('Your active dataset is unchanged');expect(container.textContent).toContain('Existing source');
 await upload([{Date:'2026-05-04',Amount:'100',__sourceRow:2}]);expect(button().disabled).toBe(false);
});
