export const PDF_PRICE_PAISE = 25;
export const MIN_TOPUP_PAISE = 10000;
export const MAX_TOPUP_PAISE = 10000000;
export const PDF_TOPUP_PRODUCT = 'pdf-download-topup';
export function parseTopupAmount(value) {
  const raw = typeof value === 'number' ? String(value) : value;
  if (typeof raw !== 'string' || !/^\d{1,6}(\.\d{1,2})?$/.test(raw.trim())) return null;
  const [whole, fraction = ''] = raw.trim().split('.');
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return paise >= MIN_TOPUP_PAISE && paise <= MAX_TOPUP_PAISE && paise % PDF_PRICE_PAISE === 0 ? { amountPaise: paise, credits: paise / PDF_PRICE_PAISE } : null;
}
