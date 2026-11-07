export const DEFAULT_HTML_EXAMPLE = `<style>
  body { font: 16px system-ui; padding: 2rem; }
  h1 { color: #6d28d9; }
</style>
<h1>Hello, OrbitBoard!</h1>
<p>Edit the HTML to see your changes in the preview.</p>`;

export function previewDocument(html) {
  if (typeof DOMParser === 'undefined') return '';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    for (const element of doc.querySelectorAll('script, base, link, meta, noscript, template, animate, set, iframe, frame, object, embed')) {
      element.remove();
    }
    for (const link of doc.querySelectorAll('a, area')) {
      link.removeAttribute('href');
      link.removeAttributeNS('http://www.w3.org/1999/xlink', 'href');
      link.removeAttribute('target');
    }
    for (const form of doc.querySelectorAll('form')) {
      form.removeAttribute('action');
      form.removeAttribute('method');
    }

    const head = doc.head || doc.createElement('head');
    if (!doc.head && doc.documentElement) {
      doc.documentElement.prepend(head);
    }

    const charset = doc.createElement('meta');
    charset.setAttribute('charset', 'utf-8');
    head.prepend(charset);

    const csp = doc.createElement('meta');
    csp.setAttribute('http-equiv', 'Content-Security-Policy');
    csp.setAttribute('content', "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'");
    head.appendChild(csp);

    return '<!doctype html>\n' + (doc.documentElement ? doc.documentElement.outerHTML : '');
  } catch {
    return '';
  }
}

