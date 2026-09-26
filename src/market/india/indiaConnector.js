import { createConnectorDescriptor, runConnector } from '../connectors';
import { filingAdapter } from '../filings';

export const INDIA_CONNECTOR_CAPABILITIES = Object.freeze({
  CORPORATE_FILINGS: 'corporate_filings',
  CORPORATE_ACTIONS: 'corporate_actions'
});

export function createIndiaFilingConnector({
  id = 'india-primary-filings',
  provider = 'Indian market primary filing connector',
  sourceId = 'primary-filings',
  fetcher
}) {
  const descriptor = createConnectorDescriptor({
    id,
    provider,
    sourceId,
    capabilities: Object.values(INDIA_CONNECTOR_CAPABILITIES),
    requiresCredentials: false
  });

  return {
    descriptor,

    async fetch(request = {}, context = {}) {
      if (typeof fetcher !== 'function') {
        throw new Error('India filing connector requires an explicit fetcher.');
      }

      const payload = await fetcher(request, context);

      return filingAdapter.normalize(payload, {
        ...context,
        issuer: request.issuer,
        identifiers: request.identifiers
      });
    }
  };
}

export async function runIndiaFilingConnector(connector, request, context = {}) {
  return runConnector(connector, request, context);
}
