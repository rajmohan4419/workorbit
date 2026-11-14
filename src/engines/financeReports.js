import { exportSpreadsheet } from './excelEngine.js';
import { FINANCE_SCOPE } from './financeImport.js';
const sourceRow = r => ({ Source: r.sourceLabel, 'Row reference': r.rowNumber, GSTIN: r.gstin, 'Invoice identifier': r.invoiceNumber, Date: r.invoiceDate, 'Taxable value': Number.isFinite(r.taxableValue) ? r.taxableValue : '', IGST: r.igst, CGST: r.cgst, SGST: r.sgst, Cess: r.cess, 'Total available tax': r.totalTax });
export function gstrReportSheets(result, labels = {}) {
  const pairs = rows => rows.map(m => ({
    ...sourceRow(m.gstr), 'Books source': m.pr.sourceLabel, 'Books row reference': m.pr.rowNumber, 'Books invoice identifier': m.pr.invoiceNumber,
    'Books taxable value': m.pr.taxableValue, 'Books IGST': m.pr.igst, 'Books CGST': m.pr.cgst, 'Books SGST': m.pr.sgst, 'Books cess': m.pr.cess,
    'Taxable difference': m.diff, 'Total tax difference': m.taxDiff,
    ...Object.fromEntries(Object.entries(m.componentDiffs).map(([k,v]) => [`${k.toUpperCase()} difference`, v])), 'Identifier normalization used': m.identifierNormalizationUsed ? 'Yes — review original identifiers' : 'No', Status: m.notes,
  }));
  return [
    { name: 'Summary', data: [
      { Metric: 'GSTR-2B source', Value: labels.gstr || '' }, { Metric: 'Books source', Value: labels.books || '' },
      { Metric: 'Tolerance per available amount', Value: result.tolerance },
      { Metric: 'Supported scope', Value: FINANCE_SCOPE },
      { Metric: 'Limitation', Value: 'File matching does not determine ITC eligibility. Missing tax fields are not zero. Totals include only valid amounts.' },
      ...Object.entries(result.rowAccounting).map(([Metric, Value]) => ({ Metric, Value })),
      ...Object.entries(result.summary).filter(([k]) => !k.startsWith('formatted')).map(([key, Value]) => ({ Metric: ({ atRiskTax: 'Tax in uploaded books only', unclaimedTax: 'Tax in uploaded GSTR-2B only' })[key] || key, Value })),
    ] },
    { name: 'Matched', data: pairs(result.matches) }, { name: 'Requires review differences', data: pairs(result.mismatches) },
    { name: 'Books only', data: result.missingIn2B.map(r => ({ ...sourceRow(r), Status: 'Present in uploaded books only' })) },
    { name: 'GSTR-2B only', data: result.missingInPr.map(r => ({ ...sourceRow(r), Status: 'Present in uploaded GSTR-2B only' })) },
    { name: 'Ambiguous and incomplete', data: result.reviewRecords.map(r => ({ ...sourceRow(r), Reason: r.reviewReason })) },
    { name: 'Rejected rows', data: result.invalidRows.map(r => ({ ...sourceRow(r), Errors: r.errors.join(' '), 'Original row (literal JSON)': JSON.stringify(r.raw) })) },
  ];
}
export function exportGstrReport(result, labels) { return exportSpreadsheet({ sheets: gstrReportSheets(result, labels) }); }
