export {
  SOURCE_CAPABILITIES,
  SOURCE_TRUST,
  createSourceDescriptor,
  assertSourceAdapter,
  normalizeAdapterResult
} from './sourceContract.js';

export { normalizeSourcePayload } from './normalizer.js';
export { demoSource, demoAdapter } from './demoAdapter.js';

export {
  NSE_PRIMARY_SOURCE,
  BSE_PRIMARY_SOURCE,
  SEBI_PRIMARY_SOURCE,
  INDIA_CONNECTOR_CAPABILITIES,
  createIndiaFilingConnector,
  runIndiaFilingConnector
} from '../india/index.js';
