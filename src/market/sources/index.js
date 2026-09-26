export {
  SOURCE_CAPABILITIES,
  SOURCE_TRUST,
  createSourceDescriptor,
  assertSourceAdapter,
  normalizeAdapterResult
} from './sourceContract';

export { normalizeSourcePayload } from './normalizer';
export { demoSource, demoAdapter } from './demoAdapter';

export {
  NSE_PRIMARY_SOURCE,
  BSE_PRIMARY_SOURCE,
  SEBI_PRIMARY_SOURCE,
  INDIA_CONNECTOR_CAPABILITIES,
  createIndiaFilingConnector,
  runIndiaFilingConnector
} from '../india';
