# HSN/SAC lookup and GST reference rates

Scope: invoice description/code autocomplete and GST calculator lookup. No taxpayer data retrieval, government API credentials, customs-duty calculation, or ERP integration.

## Provenance and limitations

- Codes: user-supplied `HSN_SAC.xlsx`, sheets HSN_MSTR and SAC_MSTR, 22,616 entries. Codes remain strings, including leading zeros. The workbook has no verified effective-date metadata.
- Rate reference: https://cbic-gst.gov.in/hindi/gst-goods-services-rates.html, captured 2026-11-14, 1,729 retained entries. Two malformed/header rows were skipped. Omitted entries were excluded. Source rowspans are expanded to preserve inherited service conditions.
- This older consolidated reference is NOT certified current for invoice dates. Capture date is not an effective date. Every lookup displays this limitation. No default tax rate is inferred from a classification, chapter, or missing match.
- Heading relationships are candidate references only. Exclusions, ranges, transaction conditions and amending notifications need review. Compensation cess and conditional/special-valued services are displayed but cannot be applied automatically by this invoice engine.
- ICEGATE https://www.icegate.gov.in/Webappl/Codes is linked for customs classification/UQC research. Customs duty is not domestic GST. No runtime ICEGATE requests are made.
- Rates are only applied after user acknowledgement and a separate button click. Manual percentage entry remains available. Nil/non-numeric references are not silently converted to zero; exemption and zero-rating are not conflated.

## Update workflow

Run `python scripts/import-gst-reference.py path/to/HSN_SAC.xlsx path/to/downloaded-cbic.html YYYY-MM-DD` in an environment with openpyxl installed. The script reads inputs without modifying them and records SHA-256 hashes and counts in `public/data/gst/manifest.json`. Source material must be separately retained for review. Inspect changes, source/amending notifications and effective dates before publishing an updated snapshot. No scheduled scraping is installed.

Run the reference engine/UI tests and the normal build after updates. Do not mark effective dates verified without a notification-backed versioned dataset and tests for invoice-date applicability.

## Runtime

Static datasets load on first search focus and are shared through one cached promise. User queries stay in memory and are not passed in network URLs. Invoice inputs and manual GST values retain their existing storage behaviour. The reference widget has no analytics calls. A fetch failure leaves manual entry available.

The compact view shows two best matches, ranking exact code entries before related headings without labelling related results as exact. More results can be revealed by hover, keyboard or click. Selecting a classification closes autocomplete; applying a rate collapses its panel into a short summary with a Change action. Changing selection or invoice date resets rate acknowledgement.
