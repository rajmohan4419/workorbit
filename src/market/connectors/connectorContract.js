export const CONNECTOR_STATUS = Object.freeze({
  READY: 'READY',
  DEGRADED: 'DEGRADED',
  FAILED: 'FAILED'
});

export function createConnectorDescriptor({
  id,
  provider,
  sourceId,
  capabilities = [],
  baseUrl = null,
  requiresCredentials = true
}) {
  if (!id || !provider || !sourceId) {
    throw new Error('Connector id, provider and sourceId are required.');
  }

  return Object.freeze({
    id,
    provider,
    sourceId,
    capabilities: [...new Set(capabilities)],
    baseUrl,
    requiresCredentials
  });
}

export function assertConnector(connector) {
  if (!connector?.descriptor?.id) {
    throw new TypeError('Connector must expose a descriptor.');
  }
  if (typeof connector.fetch !== 'function') {
    throw new TypeError('Connector must expose fetch(request, context).');
  }
  return connector;
}

export function createConnectorHealth({
  status = CONNECTOR_STATUS.READY,
  checkedAt = new Date().toISOString(),
  latencyMs = null,
  records = 0,
  warnings = 0,
  error = null
} = {}) {
  return Object.freeze({
    status,
    checkedAt,
    latencyMs,
    records,
    warnings,
    error
  });
}
