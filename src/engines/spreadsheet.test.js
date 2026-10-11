import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { jsonToXlsx, csvToXlsx, xlsxToCsv } from './spreadsheet.js';

test('jsonToXlsx - converts valid JSON array to XLSX output', () => {
  const jsonInput = JSON.stringify([
    { Name: 'Alice', Age: 30, Role: 'Developer' },
    { Name: 'Bob', Age: 25, Role: 'Designer' }
  ]);

  const output = jsonToXlsx(jsonInput);
  assert.ok(output instanceof ArrayBuffer || output instanceof Uint8Array || Array.isArray(output));

  const workbook = XLSX.read(output, { type: 'array' });
  assert.deepEqual(workbook.SheetNames, ['Data']);

  const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets['Data']);
  assert.deepEqual(sheetData, [
    { Name: 'Alice', Age: 30, Role: 'Developer' },
    { Name: 'Bob', Age: 25, Role: 'Designer' }
  ]);
});

test('jsonToXlsx - handles empty array', () => {
  const output = jsonToXlsx('[]');
  const workbook = XLSX.read(output, { type: 'array' });
  assert.deepEqual(workbook.SheetNames, ['Data']);
  const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets['Data']);
  assert.deepEqual(sheetData, []);
});

test('jsonToXlsx - throws on invalid JSON syntax', () => {
  assert.throws(() => {
    jsonToXlsx('invalid json');
  }, SyntaxError);
});

test('jsonToXlsx - throws on non-array JSON', () => {
  assert.throws(() => {
    jsonToXlsx('{"name": "Alice"}');
  }, { message: 'Expected a JSON array of objects.' });

  assert.throws(() => {
    jsonToXlsx('123');
  }, { message: 'Expected a JSON array of objects.' });
});

test('jsonToXlsx - throws on array containing non-objects', () => {
  assert.throws(() => {
    jsonToXlsx('[1, 2, 3]');
  }, { message: 'Each JSON item must be an object.' });

  assert.throws(() => {
    jsonToXlsx('["string"]');
  }, { message: 'Each JSON item must be an object.' });

  assert.throws(() => {
    jsonToXlsx('[["nested array"]]');
  }, { message: 'Each JSON item must be an object.' });

  assert.throws(() => {
    jsonToXlsx('[null]');
  }, { message: 'Each JSON item must be an object.' });
});

test('csvToXlsx - converts CSV string to XLSX buffer', () => {
  const csvInput = 'Name,Age\nAlice,30\nBob,25';
  const output = csvToXlsx(csvInput);

  const workbook = XLSX.read(output, { type: 'array' });
  assert.ok(workbook.SheetNames.length > 0);

  const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
  assert.deepEqual(sheetData, [
    { Name: 'Alice', Age: 30 },
    { Name: 'Bob', Age: 25 }
  ]);
});

test('xlsxToCsv - converts single sheet file to CSV string', async () => {
  const jsonInput = JSON.stringify([
    { col1: 'val1', col2: 'val2' },
    { col1: 'val3', col2: 'val4' }
  ]);
  const xlsxOutput = jsonToXlsx(jsonInput);

  const mockFile = {
    arrayBuffer: async () => xlsxOutput
  };

  const csvOutput = await xlsxToCsv(mockFile);
  assert.strictEqual(csvOutput.trim(), 'col1,col2\nval1,val2\nval3,val4');
});

test('xlsxToCsv - converts multi-sheet workbook to formatted CSV', async () => {
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet([{ a: 1, b: 2 }]);
  const ws2 = XLSX.utils.json_to_sheet([{ x: 10, y: 20 }]);
  XLSX.utils.book_append_sheet(wb, ws1, 'Sheet1');
  XLSX.utils.book_append_sheet(wb, ws2, 'Sheet2');

  const xlsxOutput = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const mockFile = {
    arrayBuffer: async () => xlsxOutput
  };

  const csvOutput = await xlsxToCsv(mockFile);
  assert.ok(csvOutput.includes('### Sheet: Sheet1'));
  assert.ok(csvOutput.includes('### Sheet: Sheet2'));
  assert.ok(csvOutput.includes('a,b\n1,2'));
  assert.ok(csvOutput.includes('x,y\n10,20'));
});
