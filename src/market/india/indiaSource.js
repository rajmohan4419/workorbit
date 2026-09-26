import { createSourceDescriptor, SOURCE_CAPABILITIES, SOURCE_TRUST } from '../sources/sourceContract';

export const NSE_PRIMARY_SOURCE = createSourceDescriptor({
  id: 'nse-corporate-filings',
  provider: 'NSE India corporate filings',
  trust: SOURCE_TRUST.PRIMARY,
  capabilities: [
    SOURCE_CAPABILITIES.NEWS,
    SOURCE_CAPABILITIES.CORPORATE_ACTIONS,
    SOURCE_CAPABILITIES.FUNDAMENTALS
  ],
  baseUrl: 'https://www.nseindia.com/companies-listing/corporate-filings-announcements'
});

export const BSE_PRIMARY_SOURCE = createSourceDescriptor({
  id: 'bse-corporate-filings',
  provider: 'BSE India corporate filings',
  trust: SOURCE_TRUST.PRIMARY,
  capabilities: [
    SOURCE_CAPABILITIES.NEWS,
    SOURCE_CAPABILITIES.CORPORATE_ACTIONS,
    SOURCE_CAPABILITIES.FUNDAMENTALS
  ],
  baseUrl: 'https://www.bseindia.com/corporates/ann.html'
});

export const SEBI_PRIMARY_SOURCE = createSourceDescriptor({
  id: 'sebi-filings',
  provider: 'SEBI filings',
  trust: SOURCE_TRUST.PRIMARY,
  capabilities: [
    SOURCE_CAPABILITIES.CORPORATE_ACTIONS,
    SOURCE_CAPABILITIES.FUNDAMENTALS
  ],
  baseUrl: 'https://www.sebi.gov.in/filings.html'
});
