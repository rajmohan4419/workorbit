import { computeCompoundInterest } from './compoundInterest';

// Most Indian banks compound fixed deposit interest quarterly.
export const FD_DEFAULT_FREQUENCY = 4;

/**
 * Fixed deposit maturity: the compound formula applied to a tenure given in
 * years and months. Months are converted to fractions of a year.
 */
export function computeFdMaturity({ principal, annualRatePct, years, months, timesPerYear = FD_DEFAULT_FREQUENCY }) {
  const totalYears = (Number(years) || 0) + (Number(months) || 0) / 12;
  return computeCompoundInterest({ principal, annualRatePct, years: totalYears, timesPerYear });
}
