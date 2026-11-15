import { readWorkbookSync } from './workbookReader.js';
self.onmessage = ({ data: { data, options } }) => {
  try { self.postMessage({ workbook: readWorkbookSync(data, options) }); }
  catch (error) { self.postMessage({ error: error.message || 'Invalid spreadsheet.' }); }
};
