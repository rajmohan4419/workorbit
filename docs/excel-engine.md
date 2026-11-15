# Excel data processor completion

The existing `/tools/excel-engine` is a tabular data-cleaning workspace, not a full Excel calculation/editor implementation. It processes values; formulas are not recalculated and styles, charts and macros are not retained. The UI and tool guide now state this explicitly. The separate legacy SpreadsheetEditor component is outside this change.

Implemented:
- Editable export-column names with case-insensitive uniqueness checks.
- Editable Text/Number/Date/Email schema, required fields and numeric minimums.
- Inline corrections with immediate validation and five-step undo.
- Trim, uppercase and lowercase actions for any column.
- Validation failures block the cleaned-data export, while the diagnostic report remains downloadable. Error counts distinguish issues from invalid rows.
- Exports include all current rows; search only filters the preview. Numeric schema columns become numeric values in export. Leading-zero and long CSV identifiers infer Text; users can override types.
- Worksheet switching retains changes in memory. New uploads and demo reset the prior workbook context. Failed imports preserve the displayed dataset.
- Bulk processing combines first worksheets instead of misleadingly showing only the first file. It includes a source-workbook column. Existing bulk entitlement checks remain. XLSX exports continue through the shared account/download flow; no pricing changes.
- Typed-array slices respect byte offsets, headers remain unique even when suffixes collide, wider data rows retain otherwise unnamed columns, missing worksheets reject rather than silently fall back, and non-finite/currency-only numbers fail validation.
- CSV formula protection applies to headers and values. Multi-sheet CSV exports reject instead of silently dropping sheets. Export worksheet names are sanitized and disambiguated.

Limits: 25 MB per file, 50,000 data rows and 256 columns per selected sheet. Batch maximum is 10 files, 50 MB combined and 50,000 combined rows. Work runs on the browser main thread; no worker/streaming performance claim is made. Values persist only while the workspace stays open. Date inference uses the existing engine rules; use ISO dates for predictable validation. Output is a separate workbook, never an in-place overwrite of the uploaded source.

Validation includes parser/data-preservation regressions and the interactive demo correction → validation → mapped XLSX flow, plus undo. The full repository suite and production build pass. Source formatting/formula fidelity, full Excel function support, and the legacy CSV editor are not claimed as completed.
