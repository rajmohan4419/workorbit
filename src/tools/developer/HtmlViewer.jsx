import { useState } from 'react';

const example = `<style>
  body { font: 16px system-ui; padding: 2rem; }
  h1 { color: #6d28d9; }
</style>
<h1>Hello, OrbitBoard!</h1>
<p>Edit the HTML to see your changes in the preview.</p>`;

function previewDocument(html) {
  // Parse in an inert template before removing elements that could trigger navigation or network hints.
  const template = document.createElement('template');
  template.innerHTML = html;

  for (const element of template.content.querySelectorAll('base, link, meta, noscript, template, animate, set')) {
    element.remove();
  }
  for (const link of template.content.querySelectorAll('a, area')) {
    link.removeAttribute('href');
    link.removeAttributeNS('http://www.w3.org/1999/xlink', 'href');
  }

  return `<!doctype html><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'">
${template.innerHTML}`;
}

export function HtmlViewer() {
  const [html, setHtml] = useState('');
  const [preview, setPreview] = useState('');

  function updateHtml(value) {
    setHtml(value);
    setPreview(value.trim() ? previewDocument(value) : '');
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => updateHtml(example)} className="min-h-[44px] rounded-xl bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-500">
          Load example
        </button>
        <button type="button" onClick={() => updateHtml('')} disabled={!html} className="min-h-[44px] rounded-xl border border-[var(--orbit-border)] px-4 py-2 text-sm font-semibold hover:border-accent-500 disabled:opacity-50">
          Clear
        </button>
      </div>
      <p id="html-viewer-help" className="text-sm text-stone-600 dark:text-stone-300">
        Preview HTML and inline CSS in your browser. JavaScript, external assets, and link navigation are disabled.
      </p>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <label className="block min-w-0 space-y-1.5">
          <span className="block text-sm font-semibold">HTML source</span>
          <textarea
            value={html}
            onChange={event => updateHtml(event.target.value)}
            aria-describedby="html-viewer-help"
            placeholder="<h1>Hello, world!</h1>"
            spellCheck={false}
            className="block h-80 w-full resize-y rounded-xl border border-[var(--orbit-border)] bg-white p-3 font-mono text-sm text-stone-900 focus:border-accent-500 dark:bg-stone-900 dark:text-stone-100"
          />
        </label>
        <div className="min-w-0 space-y-1.5">
          <h2 className="text-sm font-semibold">Live preview</h2>
          {preview ? (
            <iframe
              title="HTML preview"
              sandbox=""
              srcDoc={preview}
              className="block h-80 w-full rounded-xl border border-[var(--orbit-border)] bg-white"
            />
          ) : (
            <p className="flex h-80 items-center justify-center rounded-xl border border-dashed border-[var(--orbit-border)] p-4 text-center text-sm text-stone-600 dark:text-stone-300">
              Enter HTML or load the example to see a preview.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
