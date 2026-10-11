import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONNECTOR_STATUS,
  createConnectorDescriptor,
  assertConnector,
  createConnectorHealth
} from './connectorContract.js';

describe('connectorContract', () => {
  describe('CONNECTOR_STATUS', () => {
    test('contains expected status constants', () => {
      assert.equal(CONNECTOR_STATUS.READY, 'READY');
      assert.equal(CONNECTOR_STATUS.DEGRADED, 'DEGRADED');
      assert.equal(CONNECTOR_STATUS.FAILED, 'FAILED');
    });

    test('is frozen', () => {
      assert.ok(Object.isFrozen(CONNECTOR_STATUS));
    });
  });

  describe('createConnectorDescriptor', () => {
    test('creates valid descriptor with default values', () => {
      const descriptor = createConnectorDescriptor({
        id: 'conn-1',
        provider: 'alpha',
        sourceId: 'src-100'
      });

      assert.deepEqual(descriptor, {
        id: 'conn-1',
        provider: 'alpha',
        sourceId: 'src-100',
        capabilities: [],
        baseUrl: null,
        requiresCredentials: true
      });
      assert.ok(Object.isFrozen(descriptor));
    });

    test('creates descriptor with custom options and deduplicates capabilities', () => {
      const descriptor = createConnectorDescriptor({
        id: 'conn-2',
        provider: 'beta',
        sourceId: 'src-200',
        capabilities: ['read', 'write', 'read', 'sync'],
        baseUrl: 'https://api.example.com',
        requiresCredentials: false
      });

      assert.deepEqual(descriptor, {
        id: 'conn-2',
        provider: 'beta',
        sourceId: 'src-200',
        capabilities: ['read', 'write', 'sync'],
        baseUrl: 'https://api.example.com',
        requiresCredentials: false
      });
    });

    test('throws Error when required parameters are missing', () => {
      assert.throws(
        () => createConnectorDescriptor({ provider: 'p', sourceId: 's' }),
        { message: 'Connector id, provider and sourceId are required.' }
      );
      assert.throws(
        () => createConnectorDescriptor({ id: 'i', sourceId: 's' }),
        { message: 'Connector id, provider and sourceId are required.' }
      );
      assert.throws(
        () => createConnectorDescriptor({ id: 'i', provider: 'p' }),
        { message: 'Connector id, provider and sourceId are required.' }
      );
    });
  });

  describe('assertConnector', () => {
    test('returns connector if descriptor and fetch method are valid', () => {
      const connector = {
        descriptor: { id: 'conn-1' },
        fetch: () => {}
      };

      assert.equal(assertConnector(connector), connector);
    });

    test('throws TypeError if descriptor or descriptor.id is missing', () => {
      assert.throws(
        () => assertConnector(null),
        { name: 'TypeError', message: 'Connector must expose a descriptor.' }
      );
      assert.throws(
        () => assertConnector({}),
        { name: 'TypeError', message: 'Connector must expose a descriptor.' }
      );
      assert.throws(
        () => assertConnector({ descriptor: {} }),
        { name: 'TypeError', message: 'Connector must expose a descriptor.' }
      );
    });

    test('throws TypeError if fetch is not a function', () => {
      assert.throws(
        () => assertConnector({ descriptor: { id: 'conn-1' } }),
        { name: 'TypeError', message: 'Connector must expose fetch(request, context).' }
      );
      assert.throws(
        () => assertConnector({ descriptor: { id: 'conn-1' }, fetch: 'not-a-fn' }),
        { name: 'TypeError', message: 'Connector must expose fetch(request, context).' }
      );
    });
  });

  describe('createConnectorHealth', () => {
    test('creates health object with defaults', () => {
      const health = createConnectorHealth();

      assert.equal(health.status, CONNECTOR_STATUS.READY);
      assert.ok(typeof health.checkedAt === 'string');
      assert.equal(health.latencyMs, null);
      assert.equal(health.records, 0);
      assert.equal(health.warnings, 0);
      assert.equal(health.error, null);
      assert.ok(Object.isFrozen(health));
    });

    test('creates health object with custom values', () => {
      const checkedAt = '2026-03-30T10:00:00.000Z';
      const health = createConnectorHealth({
        status: CONNECTOR_STATUS.DEGRADED,
        checkedAt,
        latencyMs: 150,
        records: 42,
        warnings: 2,
        error: 'High latency'
      });

      assert.deepEqual(health, {
        status: CONNECTOR_STATUS.DEGRADED,
        checkedAt,
        latencyMs: 150,
        records: 42,
        warnings: 2,
        error: 'High latency'
      });
    });
  });
});
