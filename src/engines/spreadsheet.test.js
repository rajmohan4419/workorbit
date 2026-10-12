import { describe, it, expect } from 'vitest';
import { ensureRows, jsonToXlsx } from './spreadsheet.js';

describe('spreadsheet engine - ensureRows & jsonToXlsx', () => {
  describe('ensureRows', () => {
    it('throws an error when input is not an array', () => {
      const invalidInputs = [
        null,
        undefined,
        123,
        'string',
        true,
        { a: 1 },
      ];

      for (const input of invalidInputs) {
        expect(() => ensureRows(input)).toThrow('Expected a JSON array of objects.');
      }
    });

    it('returns an empty array when input is an empty array', () => {
      const result = ensureRows([]);
      expect(result).toEqual([]);
    });

    it('throws an error when array contains non-object or invalid items', () => {
      const invalidArrays = [
        [1, 2, 3],
        ['string'],
        [true],
        [null],
        [undefined],
        [[1, 2]],
        [{ a: 1 }, 'invalid item'],
        [{ a: 1 }, null],
        [{ a: 1 }, [1, 2]],
      ];

      for (const input of invalidArrays) {
        expect(() => ensureRows(input)).toThrow('Each JSON item must be an object.');
      }
    });

    it('returns the array when input is a valid array of objects', () => {
      const validRows = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      const result = ensureRows(validRows);
      expect(result).toBe(validRows);
      expect(result).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
    });
  });

  describe('jsonToXlsx', () => {
    it('successfully converts valid JSON string array to spreadsheet array', () => {
      const jsonString = JSON.stringify([{ name: 'Item 1', price: 10 }]);
      const result = jsonToXlsx(jsonString);
      expect(result).toBeTruthy();
      const length = result.byteLength ?? result.length;
      expect(length).toBeGreaterThan(0);
    });

    it('successfully handles empty JSON array string', () => {
      const result = jsonToXlsx('[]');
      expect(result).toBeTruthy();
    });

    it('throws Expected a JSON array of objects error for non-array JSON', () => {
      expect(() => jsonToXlsx('{"key": "value"}')).toThrow('Expected a JSON array of objects.');
    });

    it('throws Each JSON item must be an object error for JSON array of primitives', () => {
      expect(() => jsonToXlsx('[1, 2, 3]')).toThrow('Each JSON item must be an object.');
    });
  });
});
