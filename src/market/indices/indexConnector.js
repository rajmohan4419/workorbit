import { createConnectorDescriptor, runConnector } from '../connectors';

export const INDEX_CONNECTOR_CAPABILITIES = Object.freeze({
  INDEX_DEFINITION: 'index_definition'
});

export function createIndiaIndexConnector({ fetcher }) {
  const descriptor = createConnectorDescriptor({
    id: 'india-primary-index',
    provider: 'NSE Indices primary index source',
    sourceId: 'nse-indices',
    capabilities: Object.values(INDEX_CONNECTOR_CAPABILITIES),
    requiresCredentials: false
  });

  return {
    descriptor,
    async fetch(request = {}, context = {}) {
      if (typeof fetcher !== 'function') throw new Error('India index connector requires an explicit fetcher.');
      return fetcher(request, context);
    }
  };
}

export async function runIndiaIndexConnector(connector, request, context = {}) {
  return runConnector(connector, request, context);
}
