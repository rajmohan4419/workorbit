import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { csvToXlsx } from './spreadsheet.js';

test('csvToXlsx converts standard CSV text into valid XLSX ArrayBuffer', () => {
  const csvText = 'Name,Age,Role\nAlice,30,Developer\nBob,25,Designer';
  const xlsxBuffer = csvToXlsx(csvText);

  assert.ok(xlsxBuffer instanceof ArrayBuffer || ArrayBuffer.isView(xlsxBuffer));

  const workbook = XLSX.read(xlsxBuffer, { type: 'array' });
  assert.equal(workbook.SheetNames.length, 1);

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const parsedData = XLSX.utils.sheet_to_json(worksheet);

  assert.deepEqual(parsedData, [
    { Name: 'Alice', Age: 30, Role: 'Developer' },
    { Name: 'Bob', Age: 25, Role: 'Designer' }
  ]);
});

test('csvToXlsx handles CSV with quoted fields containing commas and newlines', () => {
  const csvText = 'Title,Description\n"Hello, World","Line 1\nLine 2"';
  const xlsxBuffer = csvToXlsx(csvText);

  const workbook = XLSX.read(xlsxBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const parsedData = XLSX.utils.sheet_to_json(worksheet);

  assert.deepEqual(parsedData, [
    { Title: 'Hello, World', Description: 'Line 1\nLine 2' }
  ]);
});

test('csvToXlsx handles special characters and UTF-8 content', () => {
  const csvText = 'Currency,Symbol\nEuro,€\nYen,¥\nRupee,₹';
  const xlsxBuffer = csvToXlsx(csvText);

  const workbook = XLSX.read(xlsxBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const parsedData = XLSX.utils.sheet_to_json(worksheet);

  assert.deepEqual(parsedData, [
    { Currency: 'Euro', Symbol: '€' },
    { Currency: 'Yen', Symbol: '¥' },
    { Currency: 'Rupee', Symbol: '₹' }
  ]);
});

test('csvToXlsx handles empty CSV input gracefully', () => {
  const csvText = '';
  const xlsxBuffer = csvToXlsx(csvText);

  assert.ok(xlsxBuffer instanceof ArrayBuffer || ArrayBuffer.isView(xlsxBuffer));

  const workbook = XLSX.read(xlsxBuffer, { type: 'array' });
  assert.equal(workbook.SheetNames.length, 1);
});
