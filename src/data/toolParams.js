/**
 * src/data/toolParams.js
 * Parameter schemas and URL query serialization for deep-linkable calculators.
 * Powers URL state restoration, deep-link sharing, long-tail SEO, and the Gemini router.
 */

export const TOOL_PARAMS = {
  emi: {
    title: 'EMI Calculator',
    params: [
      { key: 'amount', aliases: ['principal', 'p', 'loan'], default: '1000000', label: 'Loan Amount (₹)' },
      { key: 'rate', aliases: ['interestRate', 'r'], default: '9', label: 'Annual Interest Rate (%)' },
      { key: 'years', aliases: ['tenureYears', 'tenure', 't'], default: '5', label: 'Tenure (Years)' },
    ],
  },
  'ctc-to-inhand': {
    title: 'CTC to In-Hand Salary Calculator',
    params: [
      { key: 'ctc', aliases: ['ctcAnnual', 'annualCtc', 'salary'], default: '1000000', label: 'Annual CTC (₹)' },
      { key: 'basicPct', aliases: ['basic'], default: '40', label: 'Basic Salary %' },
      { key: 'variable', aliases: ['variablePay'], default: '0', label: 'Variable Pay (₹)' },
      { key: 'gratuity', default: '0', label: 'Gratuity (₹)' },
      { key: 'pfCap', default: 'true', label: 'Cap PF at ₹15k wage' },
      { key: 'regime', default: 'new', label: 'Tax Regime (new/old)' },
      { key: 'state', default: 'Karnataka', label: 'State' },
    ],
  },
  gst: {
    title: 'GST Calculator',
    params: [
      { key: 'amount', aliases: ['price', 'value'], default: '100000', label: 'Amount (₹)' },
      { key: 'rate', aliases: ['gstRate'], default: '18', label: 'GST Rate (%)' },
      { key: 'mode', aliases: ['type'], default: 'exclusive', label: 'Mode (exclusive/inclusive)' },
    ],
  },
  sip: {
    title: 'SIP Calculator',
    params: [
      { key: 'monthly', aliases: ['investment', 'amount'], default: '10000', label: 'Monthly SIP (₹)' },
      { key: 'rate', aliases: ['returnRate'], default: '12', label: 'Expected Return (%)' },
      { key: 'years', aliases: ['tenure'], default: '10', label: 'Period (Years)' },
    ],
  },
  'fd-maturity-calculator': {
    title: 'FD Maturity Calculator',
    params: [
      { key: 'principal', aliases: ['deposit', 'amount'], default: '100000', label: 'Deposit (₹)' },
      { key: 'rate', default: '7', label: 'Interest Rate (%)' },
      { key: 'years', default: '1', label: 'Years' },
      { key: 'months', default: '0', label: 'Months' },
      { key: 'frequency', default: '4', label: 'Compounding Frequency' },
    ],
  },
  'rd-maturity-calculator': {
    title: 'RD Maturity Calculator',
    params: [
      { key: 'deposit', aliases: ['monthly', 'amount'], default: '1000', label: 'Monthly Deposit (₹)' },
      { key: 'rate', default: '6.5', label: 'Interest Rate (%)' },
      { key: 'years', default: '1', label: 'Years' },
      { key: 'months', default: '0', label: 'Months' },
      { key: 'frequency', default: '4', label: 'Compounding Frequency' },
    ],
  },
  'compound-interest-calculator': {
    title: 'Compound Interest Calculator',
    params: [
      { key: 'principal', aliases: ['amount'], default: '100000', label: 'Initial Principal (₹)' },
      { key: 'rate', default: '10', label: 'Annual Rate (%)' },
      { key: 'years', default: '5', label: 'Period (Years)' },
      { key: 'frequency', default: '1', label: 'Compounding Times/Year' },
    ],
  },
  'loan-amortization-calculator': {
    title: 'Loan Amortization Calculator',
    params: [
      { key: 'principal', aliases: ['amount'], default: '5000000', label: 'Loan Amount (₹)' },
      { key: 'rate', default: '8.5', label: 'Annual Rate (%)' },
      { key: 'years', default: '20', label: 'Tenure (Years)' },
    ],
  },
  'hra-exemption-calculator-india': {
    title: 'HRA Exemption Calculator',
    params: [
      { key: 'basic', aliases: ['basicSalary'], default: '50000', label: 'Basic Salary (Monthly ₹)' },
      { key: 'da', default: '0', label: 'Dearness Allowance (Monthly ₹)' },
      { key: 'hra', aliases: ['hraReceived'], default: '20000', label: 'HRA Received (Monthly ₹)' },
      { key: 'rent', aliases: ['rentPaid'], default: '25000', label: 'Rent Paid (Monthly ₹)' },
      { key: 'metro', default: 'true', label: 'Metro City' },
    ],
  },
  'salary-hike': {
    title: 'Salary Hike Calculator',
    params: [
      { key: 'current', aliases: ['oldSalary'], default: '800000', label: 'Current Salary (₹)' },
      { key: 'revised', aliases: ['newSalary'], default: '1050000', label: 'Revised Salary (₹)' },
    ],
  },
  'gratuity-calculator': {
    title: 'Gratuity Calculator',
    params: [
      { key: 'salary', aliases: ['lastDrawnSalary', 'basicSalary'], default: '60000', label: 'Last Drawn Basic + DA (₹)' },
      { key: 'years', aliases: ['tenure'], default: '7', label: 'Completed Years' },
      { key: 'covered', default: 'true', label: 'Covered under Gratuity Act' },
    ],
  },
  percentage: {
    title: 'Percentage Calculator',
    params: [
      { key: 'x', aliases: ['num1', 'value'], default: '25', label: 'X value' },
      { key: 'y', aliases: ['num2', 'total'], default: '200', label: 'Y value' },
    ],
  },
  'timezone-converter': {
    title: 'Global Time Zone Converter',
    params: [
      { key: 'from', aliases: ['sourceZone'], default: 'Asia/Kolkata', label: 'Source Timezone' },
      { key: 'date', default: '', label: 'Date (YYYY-MM-DD)' },
      { key: 'time', default: '', label: 'Time (HH:MM)' },
      { key: 'to', aliases: ['dests'], default: '', label: 'Destination Timezones' },
    ],
  },
  'saas-retention-calculator': {
    title: 'SaaS Retention Calculator',
    params: [
      { key: 'startMrr', default: '100000', label: 'Starting MRR (₹)' },
      { key: 'expansionMrr', default: '15000', label: 'Expansion MRR (₹)' },
      { key: 'contractionMrr', default: '5000', label: 'Downgrade MRR (₹)' },
      { key: 'churnedMrr', default: '10000', label: 'Churned MRR (₹)' },
      { key: 'startCustomers', default: '400', label: 'Starting Customers' },
      { key: 'churnedCustomers', default: '40', label: 'Churned Customers' },
      { key: 'acquisitionSpend', default: '1200000', label: 'Acquisition Spend (₹)' },
      { key: 'newCustomers', default: '200', label: 'New Customers' },
    ],
  },
  'sales-pipeline-forecaster': {
    title: 'Sales Pipeline Forecaster',
    params: [
      { key: 'quota', default: '200000', label: 'Sales Target (₹)' },
      { key: 'stages', default: '', label: 'Stages Data' },
    ],
  },
  'saas-pricing-calculator': {
    title: 'SaaS Pricing Calculator',
    params: [
      { key: 'seats', default: '25', label: 'Seats per Customer' },
      { key: 'customers', default: '100', label: 'Customers' },
      { key: 'perSeatPrice', default: '800', label: 'Per Seat Price (₹)' },
      { key: 'flatPrice', default: '15000', label: 'Flat Price (₹)' },
    ],
  },
  'tds-calculator-india': {
    title: 'TDS Calculator India',
    params: [
      { key: 'section', default: '194C', label: 'TDS Section' },
      { key: 'amount', default: '50000', label: 'Payment Amount (₹)' },
    ],
  },
  'pf-and-esi-calculator': {
    title: 'PF and ESI Calculator',
    params: [
      { key: 'basic', aliases: ['basicSalary'], default: '25000', label: 'Basic Salary (₹)' },
      { key: 'gross', aliases: ['grossSalary'], default: '45000', label: 'Gross Salary (₹)' },
    ],
  },
};

/**
 * Extracts param values from a search string or URLSearchParams for a given tool slug.
 *
 * @param {string} slug - The tool slug (e.g. 'emi', 'ctc-to-inhand')
 * @param {string|URLSearchParams} [search] - Query string or URLSearchParams object
 * @returns {Record<string, string>} - Map of resolved parameter keys to values
 */
export function getToolParams(slug, search) {
  const schema = TOOL_PARAMS[slug];
  if (!schema) return {};

  let sp;
  if (typeof search === 'string') {
    sp = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  } else if (search instanceof URLSearchParams) {
    sp = search;
  } else if (typeof window !== 'undefined') {
    sp = new URLSearchParams(window.location.search);
  } else {
    sp = new URLSearchParams();
  }

  const result = {};
  schema.params.forEach(({ key, aliases = [], default: defaultVal }) => {
    let resolved = null;
    if (sp.has(key)) {
      resolved = sp.get(key);
    } else {
      for (const alias of aliases) {
        if (sp.has(alias)) {
          resolved = sp.get(alias);
          break;
        }
      }
    }
    result[key] = (resolved !== null && resolved !== undefined && resolved !== '') ? resolved : defaultVal;
  });

  return result;
}

/**
 * Constructs a shareable URL with parameters encoded in query string.
 *
 * @param {string} slug - The tool slug
 * @param {Record<string, any>} params - Parameter key-value pairs
 * @param {string} [origin] - Optional custom origin (defaults to window.location.origin)
 * @returns {string} - Full shareable URL
 */
export function buildShareUrl(slug, params, origin) {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : 'https://orbitboard.in');
  const sp = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') {
      sp.set(k, String(v));
    }
  });
  const qs = sp.toString();
  return `${base}/tools/${slug}${qs ? `?${qs}` : ''}`;
}

