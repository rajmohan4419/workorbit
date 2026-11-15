export const GST_STATE_CODES = {
  'Jammu & Kashmir': '01', 'Himachal Pradesh': '02', Punjab: '03', Chandigarh: '04', Uttarakhand: '05', Haryana: '06', Delhi: '07', Rajasthan: '08', 'Uttar Pradesh': '09', Bihar: '10', Sikkim: '11', 'Arunachal Pradesh': '12', Nagaland: '13', Manipur: '14', Mizoram: '15', Tripura: '16', Meghalaya: '17', Assam: '18', 'West Bengal': '19', Jharkhand: '20', Odisha: '21', Chhattisgarh: '22', 'Madhya Pradesh': '23', Gujarat: '24', 'Daman & Diu': '25', 'Dadra & Nagar Haveli': '26', Maharashtra: '27', Karnataka: '29', Goa: '30', Lakshadweep: '31', Kerala: '32', 'Tamil Nadu': '33', Puducherry: '34', 'Andaman & Nicobar Islands': '35', Telangana: '36', 'Andhra Pradesh': '37', Ladakh: '38',
};
export function validateGstin(value) {
  const gstin = String(value ?? '').trim().toUpperCase();
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin) || !Object.values(GST_STATE_CODES).includes(gstin.slice(0, 2))) return 'Invalid GSTIN format/state code (local validation only).';
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const product = alphabet.indexOf(gstin[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + product % 36;
  }
  return alphabet[(36 - sum % 36) % 36] === gstin[14] ? '' : 'GSTIN checksum mismatch (local validation only).';
}

GST_STATE_CODES['Dadra and Nagar Haveli and Daman and Diu']='26';
