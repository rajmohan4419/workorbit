import { assertConnector, createConnectorHealth } from './connectorContract';
import { normalizeAdapterResult } from '../sources/sourceContract';

export async function runConnector(connector, request = {}, context = {}) {
  assertConnector(connector);

  const startedAt = new Date().toISOString();
  const startedMs = Date.now();

  try {
    const result = await connector.fetch(request, context);

    const normalized = normalizeAdapterResult(result);

    return {
      status: 'READY',
      connector: connector.descriptor,
      startedAt,
      completedAt: new Date().toISOString(),
      ...normalized,
      health: createConnectorHealth({
        status: normalized.warnings.length ? 'DEGRADED' : 'READY',
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - startedMs,
        records: normalized.records.length,
        warnings: normalized.warnings.length
      })
    };
  } catch (error) {
    return {
      status: 'FAILED',
      connector: connector.descriptor,
      startedAt,
      completedAt: new Date().toISOString(),
      records: [],
      source: null,
      warnings: [error.message],
      health: createConnectorHealth({
        status: 'FAILED',
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - startedMs,
        error: error.message
      })
    };
  }
}
