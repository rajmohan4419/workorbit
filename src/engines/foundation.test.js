import { describe, it, expect, vi, afterEach } from 'vitest';
import * as XLSX from 'xlsx';
import { moneyPaise, sumMoney, reviewedDate } from './financeValidation.js';
import { readWorkbook, PARSE_TIMEOUT_MS } from './workbookReader.js';
import { readFinanceFile, financeSheetRows, mapFinanceRows } from './financeImport.js';
import { normalizeTransaction, reconcileTransactions } from './bankReconciliationEngine.js';
import { reconcileGstrData } from '../tools/finance/gstrReconciliationEngine.js';
import { csvToXlsx } from './spreadsheet.js';
const file = (bytes, name='synthetic.xlsx') => ({name,size:bytes.byteLength,arrayBuffer:async()=>bytes});
const txn = (source,index,overrides={}) => normalizeTransaction({date:'2026-10-15',amount:'1.005',reference:'00001',...overrides},{date:'date',amount:'amount',reference:'reference'},source,index).transaction;
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
describe('finance foundation regressions',()=>{
  it('rounds decimal money in integer paise, including negatives and Indian grouping',()=>{
    for (const [value,expected] of [['1.005',101],['(₹ 1,23,456.785)',-12345679],['-1.005',-101],[1.005,101]]) expect(moneyPaise(value)).toBe(expected);
    for(const invalid of ['1,2,3','₹','1e3','12junk','NaN']) expect(moneyPaise(invalid)).toBeNaN();
    expect(sumMoney([.1,.2])).toBe(.3);
    expect(()=>sumMoney([.1,NaN])).toThrow(/Invalid amount/);
  });
  it('requires explicit interpretation for ambiguous dates and rejects impossible dates',()=>{
    expect(()=>reviewedDate('04/05/2026')).toThrow(/Ambiguous/);
    expect(reviewedDate('04/05/2026','dmy')).toBe('2026-05-04');
    expect(reviewedDate('04/05/2026','mdy')).toBe('2026-04-05');
    expect(reviewedDate('31/02/2026','dmy')).toBe('');
    expect(reviewedDate('15/10/2026')).toBe('2026-10-15');
    expect(reviewedDate('15-Oct-2026')).toBe('2026-10-15');
  });
  it('preserves CSV identifiers and explicit zero-padded Excel cells after migration',async()=>{
    const bytes=await csvToXlsx('Account,Invoice,Amount\n000001,01234567890123456789,"1,23,456.78"');
    const loaded=await readFinanceFile(file(bytes));
    const source=financeSheetRows(loaded,loaded.sheetNames[0]);
    expect(source.rows[0]).toMatchObject({Account:'000001',Invoice:'01234567890123456789',Amount:'1,23,456.78'});
    const ws=XLSX.utils.aoa_to_sheet([['Account','Date','Amount'],[123,'04/05/2026',100]]);ws.A2.z='000000';
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Transactions');
    const excel=await readFinanceFile(file(XLSX.write(wb,{type:'array',bookType:'xlsx'})));
    const records=financeSheetRows(excel,'Transactions').rows;
    expect(records[0].Account).toBe('000123');
    expect(()=>mapFinanceRows(records,{date:'Date'})).toThrow(/Ambiguous/);
    expect(mapFinanceRows(records,{date:'Date'},'Transactions','dmy')[0].date).toBe('2026-05-04');
    expect(mapFinanceRows([{Date:'15/10/2026'}],{date:'Date'},'Transactions','mdy')[0].date).toContain('Invalid date');
  });
  it('rejects malformed ZIP data and oversized dimensions',async()=>{
    await expect(readWorkbook(new Uint8Array([80,75,3,4,0,0,0]).buffer)).rejects.toThrow();
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['A','B'],[1,2]]),'Data');
    await expect(readWorkbook(XLSX.write(wb,{type:'array',bookType:'xlsx'}),{maxColumns:1})).rejects.toThrow(/column limit/);
  });
  it('terminates a stalled worker, rejects promptly and permits a fresh retry',async()=>{
    vi.useFakeTimers();
    const instances=[];
    class FakeWorker { constructor(){this.terminate=vi.fn();instances.push(this);} postMessage(){} }
    vi.stubGlobal('Worker',FakeWorker);
    const stalled=readWorkbook(new ArrayBuffer(1));
    const rejection=expect(stalled).rejects.toThrow(/15 seconds/);
    await vi.advanceTimersByTimeAsync(PARSE_TIMEOUT_MS);await rejection;
    expect(instances[0].terminate).toHaveBeenCalledOnce();
    const retry=readWorkbook(new ArrayBuffer(1));
    instances[1].onmessage({data:{workbook:{SheetNames:['OK'],Sheets:{}}}});
    expect((await retry).SheetNames).toEqual(['OK']);
    expect(instances[1].terminate).toHaveBeenCalledOnce();
  });
  it('does not consume tied or competing bank/ledger candidates or count them as matched',()=>{
    for(const [banks,ledgers] of [[[txn('bank',0)],[txn('ledger',0),txn('ledger',1)]],[[txn('bank',0),txn('bank',1)],[txn('ledger',0)]]]) {
      const result=reconcileTransactions(banks,ledgers);
      expect(result.summary.matchedPairsCount).toBe(0);
      expect(result.bankUnmatched).toHaveLength(banks.length);
      expect(result.ledgerUnmatched).toHaveLength(ledgers.length);
      expect(result.summary.isStatementReconciled).toBe(false);
      expect(reconcileTransactions([...banks].reverse(),[...ledgers].reverse()).summary).toEqual(result.summary);
    }
  });
  it('limits matching work before constructing candidates',()=>{
    expect(()=>reconcileTransactions(Array(1000).fill(txn('bank',0)),Array(1000).fill(txn('ledger',0)))).toThrow(/candidate comparisons/);
    expect(normalizeTransaction({date:'2026-10-15',amount:1,description:'x'.repeat(1001)},{date:'date',amount:'amount',description:'description'}).error).toContain('1,000');
  });
  it('totals normalized bank rows and GST components exactly in paise',()=>{
    const result=reconcileTransactions([txn('bank',0,{amount:'.1'}),txn('bank',1,{amount:'.2'})].filter(Boolean),[]);
    // Explicit leading integer required by the parser; malformed .1 does not become zero.
    expect(result.summary.bankTotalTxnAmt).toBe(0);
    const amounts=reconcileTransactions([txn('bank',0,{amount:'0.1'}),txn('bank',1,{amount:'0.2'})],[]);
    expect(amounts.summary.bankTotalTxnAmt).toBe(.3);
    const rows=['0.1','0.2'].map((taxableValue,i)=>({gstin:'29ABCDE1234F1Z5',invoiceNumber:`000${i}`,taxableValue,igst:'1.005',cgst:0,sgst:0}));
    const gst=reconcileGstrData(rows,rows,0);
    expect(gst.summary.totalGstrTaxable).toBe(.3);expect(gst.matches[0].gstr.igst).toBe(1.01);
  });
});
