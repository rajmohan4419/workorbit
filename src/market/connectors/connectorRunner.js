import { assertConnector } from './connectorContract';
import { normalizeAdapterResult } from '../sources/sourceContract';

export async function runConnector(connector, request = {}, context = {}) {
  assertConnector(connector);

  const startedAt = new Date().toISOString();

  try {
    const result = await connector.fetch(request, context);

    const normalized = normalizeAdapterResult(result);

    return {
      status: 'READY',
      connector: connector.descriptor,
      startedAt,
      completedAt: new Date().toISOString(),
      ...normalized
    };
  } catch (error) {
    return {
      status: 'FAILED',
      connector: connector.descriptor,
      startedAt,
      completedAt: new Date().toISOString(),
      records: [],
      source: null,
      warnings: [error.message]
    };
  }
}
