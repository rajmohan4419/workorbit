"""Build local reference snapshots. No runtime government requests.

Usage: python scripts/import-gst-reference.py workbook.xlsx downloaded-cbic.html YYYY-MM-DD
Requires openpyxl for reading the supplied workbook (no workbook modifications).
Download/review the official HTML manually before running. Never infer effective dates.
"""
import hashlib
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
import openpyxl


class Tables(HTMLParser):
    """Expand rowspans so service conditions survive across subentries."""
    def __init__(self):
        super().__init__()
        self.tables = []
        self.depth = 0
        self.rows = None
        self.cells = None
        self.text = None
        self.pending = {}

    def handle_starttag(self, tag, attrs):
        if tag == 'table':
            self.depth += 1
            if self.depth == 1:
                self.rows = []
                self.pending = {}
        if self.depth != 1:
            return
        if tag == 'tr':
            self.cells = []
        if tag in ('td', 'th'):
            self.text = []
            self.span = int(dict(attrs).get('rowspan', '1'))
        if tag == 'br' and self.text is not None:
            self.text.append(' ')

    def handle_data(self, data):
        if self.text is not None:
            self.text.append(data)

    def handle_endtag(self, tag):
        if self.depth == 1:
            if tag in ('td', 'th') and self.text is not None:
                self.cells.append((' '.join(' '.join(self.text).split()), self.span))
                self.text = None
            if tag == 'tr' and self.cells is not None:
                row = []
                col = 0
                def inherited():
                    nonlocal col
                    while col in self.pending:
                        value, remaining = self.pending.pop(col)
                        row.append(value)
                        if remaining > 1:
                            self.pending[col] = (value, remaining - 1)
                        col += 1
                for value, span in self.cells:
                    inherited()
                    row.append(value)
                    if span > 1:
                        self.pending[col] = (value, span - 1)
                    col += 1
                inherited()
                self.rows.append(row)
                self.cells = None
            if tag == 'table':
                self.tables.append(self.rows)
        if tag == 'table':
            self.depth -= 1


def main():
    workbook, html, captured = sys.argv[1:]
    target = Path(__file__).resolve().parents[1] / 'public/data/gst'
    target.mkdir(parents=True, exist_ok=True)
    codes = []
    wb = openpyxl.load_workbook(workbook, read_only=True, data_only=True)
    for sheet, kind in [('HSN_MSTR', 'goods'), ('SAC_MSTR', 'services')]:
        for row_index, (code, description) in enumerate(wb[sheet].values):
            if row_index == 0 or code is None or not description:
                continue
            codes.append({'code': str(code).strip(), 'description': str(description).strip(), 'kind': kind})
    parser = Tables()
    parser.feed(Path(html).read_text())
    rates = []
    skipped = 0
    for table in parser.tables:
        goods = table[0][0] == 'Schedules'
        services = 'Description of Service' in table[0]
        if not goods and not services:
            continue
        for row_index, row in enumerate(table[1:], 1):
            if len(row) != (8 if goods else 7):
                skipped += 1
                continue
            schedule, serial, heading, description, cgst, sgst, igst, condition = row if goods else ['', *row]
            if not description or 'omitted' in description.lower() or description == '(3)':
                continue
            rates.append({'id': f'{"g" if goods else "s"}-{row_index}', 'kind': 'goods' if goods else 'services',
                          'schedule': schedule, 'serial': serial, 'heading': heading,
                          'description': description, 'cgst': cgst, 'sgst': sgst, 'igst': igst,
                          'condition': condition, 'effectiveFrom': None, 'effectiveTo': None})
    meta = {'capturedOn': captured, 'effectiveDateVerified': False,
            'codeSource': Path(workbook).name, 'codeSourceSha256': hashlib.sha256(Path(workbook).read_bytes()).hexdigest(),
            'rateSource': 'https://cbic-gst.gov.in/hindi/gst-goods-services-rates.html',
            'rateSourceSha256': hashlib.sha256(Path(html).read_bytes()).hexdigest(),
            'skippedRateRows': skipped,
            'warning': 'Reference snapshot only. Current applicability and effective dates have not been verified against amending notifications.'}
    for filename, value in [('codes.json', codes), ('rates.json', rates), ('manifest.json', {**meta, 'codeCount': len(codes), 'rateCount': len(rates)})]:
        (target / filename).write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')))
    print(json.dumps({**meta, 'codeCount': len(codes), 'rateCount': len(rates)}))


if __name__ == '__main__':
    main()
