const safe = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Loan amortisation with a yearly summary.
 * EMI = P * i * (1 + i)^N / ((1 + i)^N - 1), where i = monthly rate and N = months.
 */
export function computeLoanAmortization({ principal, annualRatePct, years, months = 0 }) {
  const P = safe(principal);
  const i = safe(annualRatePct) / 12 / 100;
  const N = Math.round(safe(years) * 12 + safe(months));

  if (P === 0 || N === 0) {
    return { emi: 0, totalPayment: 0, totalInterest: 0, months: 0, yearly: [] };
  }

  const emi = i === 0
    ? P / N
    : (P * i * Math.pow(1 + i, N)) / (Math.pow(1 + i, N) - 1);

  const yearly = [];
  let balance = P;
  let yearPrincipal = 0;
  let yearInterest = 0;

  for (let m = 1; m <= N; m++) {
    const interest = balance * i;
    // Final instalment clears any rounding drift in the balance.
    const principalPart = m === N ? balance : emi - interest;
    balance = Math.max(0, balance - principalPart);
    yearInterest += interest;
    yearPrincipal += principalPart;

    if (m % 12 === 0 || m === N) {
      yearly.push({
        year: Math.ceil(m / 12),
        principalPaid: yearPrincipal,
        interestPaid: yearInterest,
        closingBalance: balance,
      });
      yearPrincipal = 0;
      yearInterest = 0;
    }
  }

  const totalPayment = emi * N;
  return { emi, totalPayment, totalInterest: totalPayment - P, months: N, yearly };
}
