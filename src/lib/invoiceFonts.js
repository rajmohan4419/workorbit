import regularUrl from '../assets/invoice-fonts/inter-regular.woff?url';
import boldUrl from '../assets/invoice-fonts/inter-bold.woff?url';
let pending;
export function loadInvoiceFonts() {
  if (!pending) pending = Promise.all([regularUrl, boldUrl].map(async url => {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Invoice fonts could not load. Please retry.');
    return new Uint8Array(await response.arrayBuffer());
  })).then(([regular,bold]) => ({regular,bold})).catch(error => { pending = null; throw error; });
  return pending;
}
