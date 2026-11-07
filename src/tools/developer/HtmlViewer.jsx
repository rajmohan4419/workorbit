import { useState } from 'react';
import { previewDocument, DEFAULT_HTML_EXAMPLE } from '../../lib/htmlPreview';

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
        <button
          type="button"
          onClick={() => updateHtml(DEFAULT_HTML_EXAMPLE)}
          className="min-h-[44px] rounded-xl bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-500"
        >
          Load example
        </button>
        <button
          type="button"
          onClick={() => updateHtml('')}
          disabled={!html}
          className="min-h-[44px] rounded-xl border border-[var(--orbit-border)] px-4 py-2 text-sm font-semibold hover:border-accent-500 disabled:opacity-50"
        >
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
            onChange={(event) => updateHtml(event.target.value)}
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
