import { createSecurityIdentifier, IDENTIFIER_TYPES } from '../identifiers';
import { createIndiaFilingConnector, runIndiaFilingConnector } from './indiaConnector';

export const INFOSYS_SECURITY = Object.freeze({
  issuer: 'Infosys Limited',
  exchange: 'NSE',
  identifiers: [
    createSecurityIdentifier({
      value: 'INFY',
      type: IDENTIFIER_TYPES.SYMBOL,
      exchange: 'NSE',
      issuer: 'Infosys Limited',
      source: 'runtime-source'
    })
  ]
});

/**
 * Runtime validation connector.
 *
 * The connector deliberately accepts a fetcher rather than embedding a
 * vendor, scraper, credentials, or copied market values in the repository.
 * The returned payload must pass through the primary-filing adapter and the
 * normal evidence/verification pipeline.
 */
export function createInfosysFilingConnector(fetcher) {
  return createIndiaFilingConnector({
    id: 'infosys-primary-filings',
    provider: 'Infosys primary filing source',
    sourceId: 'primary-filings',
    fetcher
  });
}

export async function runInfosysValidation(fetcher, context = {}) {
  const connector = createInfosysFilingConnector(fetcher);

  return runIndiaFilingConnector(
    connector,
    {
      issuer: INFOSYS_SECURITY.issuer,
      identifiers: INFOSYS_SECURITY.identifiers
    },
    context
  );
}
