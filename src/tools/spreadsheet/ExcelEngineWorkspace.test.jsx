// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {beforeEach,afterEach,describe,expect,it,vi} from 'vitest';
import Workspace from './ExcelEngineWorkspace';
import * as engine from '../../engines/excelEngine';
vi.mock('../../lib/monetization/usePlan',()=>({usePlan:()=>({hasFeature:()=>true})}));
vi.mock('../../lib/analytics',()=>({trackExportClicked:vi.fn()}));
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
describe('Excel correction workflow',()=>{
 let root,container,download;
 beforeEach(async()=>{container=document.createElement('div');document.body.append(container);root=createRoot(container);download=vi.spyOn(engine,'downloadSpreadsheetBlob').mockImplementation(()=>{});await act(async()=>root.render(<Workspace/>));});
 afterEach(async()=>{await act(async()=>root.unmount());container.remove();vi.restoreAllMocks();});
 async function click(text){await act(async()=>[...container.querySelectorAll('button')].find(button=>button.textContent.trim()===text).click());}
 async function edit(label,value){const input=container.querySelector(`[aria-label="${label}"]`);await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});}
 it('blocks invalid exports, updates checks as cells are corrected, maps output names and exports',async()=>{
  await click('Load Demo Sheet');await click('Export XLSX');expect(download).not.toHaveBeenCalled();
  expect(container.textContent).toContain('3 invalid rows');
  await edit('Row 3 Customer Email','valid@example.test');await edit('Row 4 Order ID','ORD-104');await edit('Row 5 Amount','100');
  expect(container.textContent).toContain('All 5 rows passed');
  await edit('Export name for Amount','Net amount');await click('Export XLSX');expect(download).toHaveBeenCalledOnce();
  const blob=download.mock.calls[0][0];expect(blob.type).toContain('spreadsheetml');
 });
 it('undoes an inline correction',async()=>{
  await click('Load Demo Sheet');await edit('Row 1 Order ID','CHANGED');await click('Undo last change');
  expect(container.querySelector('[aria-label="Row 1 Order ID"]').value).toBe('ORD-101');
 });
 it('combines all batch records and retains source workbook names',async()=>{
  vi.spyOn(engine,'processSpreadsheetBatch').mockResolvedValue({totalFiles:2,totalRows:2,results:[{filename:'first.xlsx',rowCount:1},{filename:'second.xlsx',rowCount:1}],allRows:[{ID:'FIRST'},{ID:'SECOND'}]});
  const input=container.querySelector('#bulk-file-input');Object.defineProperty(input,'files',{value:[new File(['a'],'first.xlsx'),new File(['b'],'second.xlsx')]});
  await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));
  expect(container.querySelector('[aria-label="Row 2 ID"]').value).toBe('SECOND');
  await click('Export CSV');const text=await download.mock.calls[0][0].text();expect(text).toContain('FIRST');expect(text).toContain('SECOND');expect(text).toContain('second.xlsx');
 });
 it('retains corrections when switching worksheets',async()=>{
  vi.spyOn(engine,'parseSpreadsheet').mockImplementation(async(_file,{sheetName})=>({headers:['ID'],rows:[{ID:sheetName==='Two'?'B':'A'}],sheetNames:['One','Two'],selectedSheet:sheetName||'One',duplicateHeaders:[],emptyHeaders:[],rowCount:1}));
  const input=container.querySelector('#bulk-file-input');Object.defineProperty(input,'files',{value:[new File(['a'],'source.xlsx')]});
  await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));
  await edit('Row 1 ID','EDITED');
  const selector=container.querySelector('select');
  await act(async()=>{selector.value='Two';selector.dispatchEvent(new Event('change',{bubbles:true}));});
  expect(container.querySelector('[aria-label="Row 1 ID"]').value).toBe('B');
  await act(async()=>{selector.value='One';selector.dispatchEvent(new Event('change',{bubbles:true}));});
  expect(container.querySelector('[aria-label="Row 1 ID"]').value).toBe('EDITED');
 });

});
