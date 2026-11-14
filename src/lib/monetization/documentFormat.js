export function isMeteredDocument(filename = '', mimeType = '') {
  return /\.(pdf|xlsx)$/i.test(filename) || mimeType === 'application/pdf'
    || mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
}
export function documentFormat(filename = '', mimeType = '') {
  return /\.xlsx$/i.test(filename) || mimeType.includes('spreadsheetml') ? 'xlsx' : 'pdf';
}
