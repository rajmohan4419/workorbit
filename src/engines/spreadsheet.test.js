import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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
        assert.throws(
          () => ensureRows(input),
          {
            name: 'Error',
            message: 'Expected a JSON array of objects.',
          },
          `Expected ensureRows to throw for input: ${JSON.stringify(input)}`
        );
      }
    });

    it('returns an empty array when input is an empty array', () => {
      const result = ensureRows([]);
      assert.deepStrictEqual(result, []);
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
        assert.throws(
          () => ensureRows(input),
          {
            name: 'Error',
            message: 'Each JSON item must be an object.',
          },
          `Expected ensureRows to throw for array: ${JSON.stringify(input)}`
        );
      }
    });

    it('returns the array when input is a valid array of objects', () => {
      const validRows = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      const result = ensureRows(validRows);
      assert.strictEqual(result, validRows);
      assert.deepStrictEqual(result, [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
    });
  });

  describe('jsonToXlsx', () => {
    it('successfully converts valid JSON string array to spreadsheet array', () => {
      const jsonString = JSON.stringify([{ name: 'Item 1', price: 10 }]);
      const result = jsonToXlsx(jsonString);
      assert.ok(result);
      const length = result.byteLength ?? result.length;
      assert.ok(length > 0);
    });

    it('successfully handles empty JSON array string', () => {
      const result = jsonToXlsx('[]');
      assert.ok(result);
    });

    it('throws Expected a JSON array of objects error for non-array JSON', () => {
      assert.throws(
        () => jsonToXlsx('{"key": "value"}'),
        {
          name: 'Error',
          message: 'Expected a JSON array of objects.',
        }
      );
    });

    it('throws Each JSON item must be an object error for JSON array of primitives', () => {
      assert.throws(
        () => jsonToXlsx('[1, 2, 3]'),
        {
          name: 'Error',
          message: 'Each JSON item must be an object.',
        }
      );
    });
  });
});
