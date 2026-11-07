/**
 * @vitest-environment jsdom
 */
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { HtmlViewer } from './HtmlViewer';
import { previewDocument } from '../../lib/htmlPreview';

describe('HtmlViewer component & previewDocument sanitizer', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  describe('previewDocument sanitizer', () => {
    it('generates a full HTML document with CSP and charset meta tags for snippets', () => {
      const doc = previewDocument('<h1>Hello World</h1><p>Test paragraph</p>');
      expect(doc).toContain('<!doctype html>');
      expect(doc).toContain('<meta charset="utf-8">');
      expect(doc).toContain('http-equiv="Content-Security-Policy"');
      expect(doc).toContain("default-src 'none'");
      expect(doc).toContain("style-src 'unsafe-inline'");
      expect(doc).toContain('<h1>Hello World</h1>');
      expect(doc).toContain('<p>Test paragraph</p>');
    });

    it('strips <script> tags and inline script attempts', () => {
      const doc = previewDocument('<div>Safe</div><script>alert("xss")</script>');
      expect(doc).toContain('<div>Safe</div>');
      expect(doc).not.toContain('<script');
      expect(doc).not.toContain('alert');
    });

    it('strips <link>, <base>, and user <meta> tags', () => {
      const doc = previewDocument(`
        <link rel="stylesheet" href="https://malicious.com/style.css">
        <base href="https://evil.com">
        <meta http-equiv="refresh" content="0;url=https://evil.com">
        <p>Content</p>
      `);
      expect(doc).not.toContain('https://malicious.com');
      expect(doc).not.toContain('https://evil.com');
      expect(doc).not.toContain('http-equiv="refresh"');
      expect(doc).toContain('<p>Content</p>');
    });

    it('strips nested frames, objects, and embeds', () => {
      const doc = previewDocument(`
        <iframe src="https://evil.com"></iframe>
        <object data="bad.swf"></object>
        <embed src="bad.pdf">
        <p>Safe content</p>
      `);
      expect(doc).not.toContain('<iframe');
      expect(doc).not.toContain('<object');
      expect(doc).not.toContain('<embed');
      expect(doc).toContain('<p>Safe content</p>');
    });

    it('removes href and target from links to prevent link navigation', () => {
      const doc = previewDocument('<a href="https://example.com" target="_blank">Click here</a>');
      expect(doc).toContain('<a>Click here</a>');
      expect(doc).not.toContain('href=');
      expect(doc).not.toContain('target=');
    });

    it('removes action and method from form elements', () => {
      const doc = previewDocument('<form action="https://evil.com" method="post"><input name="t"/></form>');
      expect(doc).not.toContain('action=');
      expect(doc).not.toContain('method=');
      expect(doc).toContain('<form');
    });

    it('handles full HTML documents with head styles and body attributes', () => {
      const input = `<!doctype html><html><head><style>h1 { color: purple; }</style></head><body style="margin: 0;"><h1>Styled</h1></body></html>`;
      const doc = previewDocument(input);
      expect(doc).toContain('h1 { color: purple; }');
      expect(doc).toContain('style="margin: 0;"');
      expect(doc).toContain('<h1>Styled</h1>');
    });
  });

  describe('HtmlViewer UI component', () => {
    it('renders empty editor with placeholder and disabled Clear button initially', async () => {
      await act(async () => {
        root.render(<HtmlViewer />);
      });

      const textarea = container.querySelector('textarea');
      expect(textarea).not.toBeNull();
      expect(textarea.value).toBe('');

      const buttons = container.querySelectorAll('button');
      const loadBtn = Array.from(buttons).find((b) => b.textContent.includes('Load example'));
      const clearBtn = Array.from(buttons).find((b) => b.textContent.includes('Clear'));

      expect(loadBtn).toBeDefined();
      expect(clearBtn).toBeDefined();
      expect(clearBtn.disabled).toBe(true);

      expect(container.textContent).toContain('Enter HTML or load the example to see a preview.');
      expect(container.querySelector('iframe')).toBeNull();
    });

    it('clicking "Load example" loads example markup and renders iframe preview', async () => {
      await act(async () => {
        root.render(<HtmlViewer />);
      });

      const loadBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Load example')
      );

      await act(async () => {
        loadBtn.click();
      });

      const textarea = container.querySelector('textarea');
      expect(textarea.value).toContain('Hello, OrbitBoard!');

      const iframe = container.querySelector('iframe');
      expect(iframe).not.toBeNull();
      expect(iframe.getAttribute('sandbox')).toBe('');
      expect(iframe.getAttribute('srcDoc')).toContain('Hello, OrbitBoard!');

      const clearBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Clear')
      );
      expect(clearBtn.disabled).toBe(false);
    });

    it('typing HTML in textarea updates the live preview', async () => {
      await act(async () => {
        root.render(<HtmlViewer />);
      });

      const textarea = container.querySelector('textarea');

      await act(async () => {
        // React synthetic event via native setter
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          'value'
        ).set;
        nativeSetter.call(textarea, '<h2>Interactive Test</h2>');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      });

      const iframe = container.querySelector('iframe');
      expect(iframe).not.toBeNull();
      expect(iframe.getAttribute('srcDoc')).toContain('<h2>Interactive Test</h2>');
    });

    it('clicking "Clear" empties the textarea and resets the preview to placeholder', async () => {
      await act(async () => {
        root.render(<HtmlViewer />);
      });

      const loadBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Load example')
      );
      await act(async () => {
        loadBtn.click();
      });

      const clearBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Clear')
      );
      await act(async () => {
        clearBtn.click();
      });

      const textarea = container.querySelector('textarea');
      expect(textarea.value).toBe('');
      expect(clearBtn.disabled).toBe(true);
      expect(container.querySelector('iframe')).toBeNull();
      expect(container.textContent).toContain('Enter HTML or load the example to see a preview.');
    });
  });
});
