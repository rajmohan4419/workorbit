import { useState } from 'react';
import { Field, Result } from '../../components/tools/ToolFields';
import { num } from '../../lib/toolFormat';

export function ExportActions({ content, filename = 'orbitboard-result.txt' }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { void 0; } };
  const download = () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap gap-2 pt-2">
      <button type="button" onClick={copy} className="rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-2.5 text-sm font-semibold hover:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500 min-h-[44px]">
        {copied ? 'Copied!' : 'Copy result'}
      </button>
      <button type="button" onClick={download} className="rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-300 min-h-[44px]">
        Export .txt
      </button>
    </div>
  );
}

export function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [useUpper, setUseUpper] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  const [copied, setCopied] = useState(false);
  const [password, setPassword] = useState('');

  const poolSize = (useUpper ? (excludeAmbiguous ? 24 : 26) : 0) +
                   (useLower ? (excludeAmbiguous ? 24 : 26) : 0) +
                   (useNumbers ? (excludeAmbiguous ? 8 : 10) : 0) +
                   (useSymbols ? 26 : 0);

  const entropy = password && poolSize > 0 ? Math.round(length * Math.log2(poolSize)) : 0;
  const strength = entropy < 40 ? 'Weak' : entropy < 65 ? 'Moderate' : entropy < 90 ? 'Strong' : 'Very Strong';

  const generate = () => {
    let chars = '';
    if (useUpper) chars += excludeAmbiguous ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (useLower) chars += excludeAmbiguous ? 'abcdefghijkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
    if (useNumbers) chars += excludeAmbiguous ? '23456789' : '0123456789';
    if (useSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    if (!chars) { setPassword(''); return; }
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    let res = '';
    for (let i = 0; i < length; i++) {
      res += chars[array[i] % chars.length];
    }
    setPassword(res);
  };

  const copyToClipboard = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { void 0; }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-5">
        <label className="block space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-stone-700 dark:text-stone-300">
            <span>Password Length</span>
            <span className="text-sm font-bold text-accent-700 dark:text-accent-400">{length} characters</span>
          </div>
          <input
            type="range"
            min="8"
            max="64"
            value={length}
            onChange={e => setLength(Number(e.target.value))}
            className="w-full accent-accent-600 h-2 bg-stone-200 dark:bg-stone-800 rounded-lg cursor-pointer"
          />
        </label>

        <div className="space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Character Types</span>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 px-4 py-3 flex items-center justify-between min-h-[44px] cursor-pointer">
              <span className="text-sm font-medium text-stone-800 dark:text-stone-200">Uppercase (A-Z)</span>
              <input type="checkbox" checked={useUpper} onChange={e => setUseUpper(e.target.checked)} className="w-5 h-5 rounded text-accent-600" />
            </label>

            <label className="rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 px-4 py-3 flex items-center justify-between min-h-[44px] cursor-pointer">
              <span className="text-sm font-medium text-stone-800 dark:text-stone-200">Lowercase (a-z)</span>
              <input type="checkbox" checked={useLower} onChange={e => setUseLower(e.target.checked)} className="w-5 h-5 rounded text-accent-600" />
            </label>

            <label className="rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 px-4 py-3 flex items-center justify-between min-h-[44px] cursor-pointer">
              <span className="text-sm font-medium text-stone-800 dark:text-stone-200">Numbers (0-9)</span>
              <input type="checkbox" checked={useNumbers} onChange={e => setUseNumbers(e.target.checked)} className="w-5 h-5 rounded text-accent-600" />
            </label>

            <label className="rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 px-4 py-3 flex items-center justify-between min-h-[44px] cursor-pointer">
              <span className="text-sm font-medium text-stone-800 dark:text-stone-200">Symbols (!@#$)</span>
              <input type="checkbox" checked={useSymbols} onChange={e => setUseSymbols(e.target.checked)} className="w-5 h-5 rounded text-accent-600" />
            </label>
          </div>

          <label className="rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 px-4 py-3 flex items-center justify-between min-h-[44px] cursor-pointer mt-3">
            <div>
              <span className="block text-sm font-medium text-stone-800 dark:text-stone-200">Exclude Ambiguous Characters</span>
              <span className="block text-xs text-stone-500 dark:text-stone-400">Avoids 0, O, I, l, 1</span>
            </div>
            <input type="checkbox" checked={excludeAmbiguous} onChange={e => setExcludeAmbiguous(e.target.checked)} className="w-5 h-5 rounded text-accent-600" />
          </label>
        </div>

        <button onClick={generate} className="w-full rounded-xl bg-accent-600 text-white py-3 px-5 font-semibold hover:bg-accent-500 transition min-h-[44px]">
          Regenerate Password
        </button>
      </div>

      <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20 h-fit">
        <h3 className="text-sm font-bold uppercase tracking-wider text-accent-700 dark:text-accent-400">Generated Output</h3>

        <div className="rounded-2xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 space-y-3">
          <textarea
            readOnly
            value={password || 'Please select at least one character type.'}
            rows={3}
            className="w-full font-mono text-base sm:text-lg break-all text-stone-900 dark:text-stone-100 bg-transparent outline-none resize-none"
          />

          <button
            onClick={copyToClipboard}
            disabled={!password}
            className="w-full rounded-xl bg-accent-600 text-white py-2.5 text-sm font-semibold hover:bg-accent-500 disabled:opacity-50 transition min-h-[44px]"
          >
            {copied ? 'Copied to Clipboard!' : 'Copy Password'}
          </button>
        </div>

        <div className="space-y-3">
          <Result label="Entropy Score" value={`${entropy} bits`} highlight />
          <Result label="Password Strength" value={strength} highlight={strength === 'Very Strong' || strength === 'Strong'} />
        </div>
      </div>
    </div>
  );
}

export function JsonFormatter() {
  const [input, setInput] = useState('{"name":"OrbitBoard","tools":["JSON","JWT"]}'); const [mode, setMode] = useState('format');
  let output = '', error = '';
  try { const parsed = JSON.parse(input); output = mode === 'minify' ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2); } catch (e) { error = e.message; }

  return (
    <div className="space-y-4">
      <textarea value={input} onChange={e => setInput(e.target.value)} className="w-full h-56 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base text-stone-900 dark:text-stone-100 min-h-[44px]" />
      <div className="flex gap-2">
        <button onClick={() => setMode('format')} className="rounded-xl bg-accent-600 text-white px-4 py-2.5 text-sm font-semibold min-h-[44px]">Format</button>
        <button onClick={() => setMode('minify')} className="rounded-xl border border-[var(--orbit-border)] px-4 py-2.5 text-sm font-semibold min-h-[44px]">Minify</button>
      </div>
      {error ? <p className="text-sm text-red-400">Invalid JSON: {error}</p> : (
        <div className="overflow-x-auto no-scrollbar">
          <textarea readOnly value={output} className="w-full h-56 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 font-mono text-base text-stone-900 dark:text-stone-100" />
          <ExportActions content={output} filename="orbitboard-json.txt" />
        </div>
      )}
    </div>
  );
}

export function JsonToCsv() {
  const [input, setInput] = useState('[{"name":"John Doe","role":"Developer"},{"name":"Mitra","role":"Assistant"}]'); let csv = '', error = '';
  try { const rows = JSON.parse(input); if (!Array.isArray(rows)) throw new Error('JSON must be an array of objects'); const keys = [...new Set(rows.flatMap(r => Object.keys(r)))]; const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"'; csv = [keys.map(esc).join(','), ...rows.map(r => keys.map(k => esc(typeof r[k] === 'object' ? JSON.stringify(r[k]) : r[k])).join(','))].join('\n'); } catch (e) { error = e.message; }

  return (
    <div className="space-y-4">
      <textarea value={input} onChange={e => setInput(e.target.value)} className="w-full h-56 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
      {error ? <p className="text-sm text-red-400">{error}</p> : (
        <div className="overflow-x-auto no-scrollbar space-y-3">
          <textarea readOnly value={csv} className="w-full h-56 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 font-mono text-base" />
          <ExportActions content={csv} filename="orbitboard-data.csv" />
        </div>
      )}
    </div>
  );
}

export function Base64Tool() {
  const [input, setInput] = useState('Hello OrbitBoard'); const [mode, setMode] = useState('encode'); let output = '', error = '';
  try { output = mode === 'encode' ? btoa(unescape(encodeURIComponent(input))) : decodeURIComponent(escape(atob(input))); } catch { error = 'Invalid Base64 input'; }

  return (
    <div className="space-y-4">
      <textarea value={input} onChange={e => setInput(e.target.value)} className="w-full h-40 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
      <div className="flex gap-2">
        <button onClick={() => setMode('encode')} className="rounded-xl bg-accent-600 text-white px-4 py-2.5 text-sm font-semibold min-h-[44px]">Encode</button>
        <button onClick={() => setMode('decode')} className="rounded-xl border border-[var(--orbit-border)] px-4 py-2.5 text-sm font-semibold min-h-[44px]">Decode</button>
      </div>
      <textarea readOnly value={error || output} className="w-full h-40 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 font-mono text-base" />
      <ExportActions content={error || output} filename="orbitboard-base64.txt" />
    </div>
  );
}

export function JwtDecoder() {
  const [token, setToken] = useState(''); let header = '', payload = '', error = '';
  try { if (token.trim()) { const p = token.split('.'); if (p.length !== 3) throw new Error('A JWT must contain three parts'); const dec = s => { const normalized = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '='); return JSON.stringify(JSON.parse(decodeURIComponent(escape(atob(normalized)))), null, 2); }; header = dec(p[0]); payload = dec(p[1]); } } catch (e) { error = 'Invalid JWT: ' + e.message; }

  return (
    <div className="space-y-4">
      <textarea value={token} onChange={e => setToken(e.target.value)} placeholder="Paste JWT here" className="w-full h-32 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="grid sm:grid-cols-2 gap-4">
        <textarea readOnly value={header} placeholder="Header" className="w-full h-52 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 font-mono text-base" />
        <textarea readOnly value={payload} placeholder="Payload" className="w-full h-52 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 font-mono text-base" />
      </div>
    </div>
  );
}

export function UnixTimestamp() {
  const [ts, setTs] = useState(() => String(Math.floor(Date.now() / 1000))); const [date, setDate] = useState('');
  const parsed = Number(ts); const dateValue = new Date(parsed * 1000); const readable = Number.isFinite(parsed) && !Number.isNaN(dateValue.getTime()) ? dateValue.toISOString() : 'Invalid timestamp'; const fromDate = date ? Math.floor(new Date(date).getTime() / 1000) : '';

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <Field label="Unix timestamp (seconds)" value={ts} onChange={setTs} />
        <label className="block">
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Date/time to convert</span>
          <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base min-h-[44px]" />
        </label>
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-3">
        <Result label="UTC Date" value={readable} highlight />
        {date && <Result label="Calculated Timestamp" value={String(fromDate)} />}
      </div>
    </div>
  );
}

export function UuidGenerator() {
  const [count, setCount] = useState('5'); const [ids, setIds] = useState(() => Array.from({ length: 5 }, () => crypto.randomUUID()));
  return (
    <div className="space-y-4">
      <Field label="Number of UUIDs" value={count} onChange={setCount} />
      <button onClick={() => setIds(Array.from({ length: Math.min(50, Math.max(1, Math.floor(num(count)))) }, () => crypto.randomUUID()))} className="rounded-xl bg-accent-600 text-white px-4 py-2.5 text-sm font-semibold min-h-[44px]">
        Generate UUIDs
      </button>
      <textarea readOnly value={ids.join('\n')} className="w-full h-56 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 font-mono text-base" />
      <ExportActions content={ids.join('\n')} filename="orbitboard-uuids.txt" />
    </div>
  );
}

export function UrlEncoder() {
  const [input, setInput] = useState('https://orbitboard.in/tools?name=John%20Doe'); const [mode, setMode] = useState('encode'); let output;
  try { output = mode === 'encode' ? encodeURIComponent(input) : decodeURIComponent(input); } catch { output = 'Invalid encoded URL component'; }

  return (
    <div className="space-y-4">
      <textarea value={input} onChange={e => setInput(e.target.value)} className="w-full h-40 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
      <div className="flex gap-2">
        <button onClick={() => setMode('encode')} className="rounded-xl bg-accent-600 text-white px-4 py-2.5 text-sm font-semibold min-h-[44px]">Encode</button>
        <button onClick={() => setMode('decode')} className="rounded-xl border border-[var(--orbit-border)] px-4 py-2.5 text-sm font-semibold min-h-[44px]">Decode</button>
      </div>
      <textarea readOnly value={output} className="w-full h-40 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 font-mono text-base" />
    </div>
  );
}

export function DiffChecker() {
  const [left, setLeft] = useState(''), [right, setRight] = useState(''), [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const leftLines = left.split(/\r?\n/), rightLines = right.split(/\r?\n/);
  const max = Math.max(leftLines.length, rightLines.length);
  const normalize = s => ignoreWhitespace ? s.replace(/\s+/g, ' ').trim() : s;
  const rows = Array.from({ length: max }, (_, i) => ({ n: i + 1, left: leftLines[i] ?? '', right: rightLines[i] ?? '', same: normalize(leftLines[i] ?? '') === normalize(rightLines[i] ?? '') }));
  const changed = rows.filter(r => !r.same).length;

  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-2 gap-4">
        <label className="block"><span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Original Text</span>
          <textarea value={left} onChange={e => setLeft(e.target.value)} placeholder="Paste original text…" className="mt-1.5 w-full h-72 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
        </label>
        <label className="block"><span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Modified Text</span>
          <textarea value={right} onChange={e => setRight(e.target.value)} placeholder="Paste modified text…" className="mt-1.5 w-full h-72 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-stone-300 cursor-pointer min-h-[44px]">
          <input type="checkbox" checked={ignoreWhitespace} onChange={e => setIgnoreWhitespace(e.target.checked)} className="w-4 h-4 rounded text-accent-600" /> Ignore whitespace
        </label>
        <Result label="Changed lines" value={String(changed)} highlight />
      </div>

      <div className="overflow-x-auto no-scrollbar rounded-2xl border border-[var(--orbit-border)]">
        <table className="w-full min-w-[600px] text-left text-xs">
          <thead className="bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-b border-[var(--orbit-border)]">
            <tr><th className="p-3 w-16">Line</th><th className="p-3">Original</th><th className="p-3">Modified</th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.n} className={r.same ? 'border-t border-[var(--orbit-border)]/50' : 'border-t border-accent-400/30 bg-accent-50/50 dark:bg-accent-950/30'}>
                <td className="p-3 text-stone-400 font-mono">{r.n}</td>
                <td className="p-3 font-mono whitespace-pre-wrap break-all text-stone-800 dark:text-stone-200">{r.left}</td>
                <td className="p-3 font-mono whitespace-pre-wrap break-all text-stone-800 dark:text-stone-200">{r.right}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function JsonToXml() {
  const [input, setInput] = useState('{"name":"John Doe","role":"Developer"}'), [output, setOutput] = useState(''), [error, setError] = useState('');
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const build = (value, key = 'root', depth = 0) => { const pad = '  '.repeat(depth); if (Array.isArray(value)) return value.map(v => build(v, key, depth)).join('\n'); if (value && typeof value === 'object') return `<${key}>\n${Object.entries(value).map(([k, v]) => build(v, k, depth + 1)).join('\n')}\n${pad}</${key}>`; return `<${key}>${esc(value ?? '')}</${key}>`; };
  const convert = () => { try { setOutput('<?xml version="1.0" encoding="UTF-8"?>\n' + build(JSON.parse(input))); setError(''); } catch (e) { setError('Invalid JSON: ' + e.message); setOutput(''); } };

  return (
    <div className="space-y-4">
      <textarea value={input} onChange={e => setInput(e.target.value)} className="w-full h-48 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
      <button onClick={convert} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Convert to XML</button>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {output && (
        <div className="overflow-x-auto no-scrollbar space-y-3">
          <textarea readOnly value={output} className="w-full h-64 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 font-mono text-base" />
          <ExportActions content={output} filename="orbitboard.xml" />
        </div>
      )}
    </div>
  );
}

export function XmlToJson() {
  const [input, setInput] = useState('<root><name>John Doe</name><role>Developer</role></root>'), [output, setOutput] = useState(''), [error, setError] = useState('');
  const parseNode = node => { if (!node.children.length) return node.textContent ?? ''; const obj = {}; Array.from(node.children).forEach(child => { const value = parseNode(child); obj[child.tagName] === undefined ? obj[child.tagName] = value : obj[child.tagName] = [].concat(obj[child.tagName], value); }); return obj; };
  const convert = () => { try { const doc = new DOMParser().parseFromString(input, 'application/xml'); if (doc.querySelector('parsererror')) throw new Error('Invalid XML'); setOutput(JSON.stringify({ [doc.documentElement.tagName]: parseNode(doc.documentElement) }, null, 2)); setError(''); } catch (e) { setError(e.message); setOutput(''); } };

  return (
    <div className="space-y-4">
      <textarea value={input} onChange={e => setInput(e.target.value)} className="w-full h-48 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
      <button onClick={convert} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Convert to JSON</button>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {output && (
        <div className="overflow-x-auto no-scrollbar space-y-3">
          <textarea readOnly value={output} className="w-full h-64 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 font-mono text-base" />
          <ExportActions content={output} filename="orbitboard.json" />
        </div>
      )}
    </div>
  );
}

export function MarkdownToHtml() {
  const [input, setInput] = useState('# Hello OrbitBoard\n\nThis is **bold** and *italic*.'), [output, setOutput] = useState('');
  const inline = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/`(.+?)`/g, '<code>$1</code>');
  const convert = () => {
    const lines = input.split(/\r?\n/), html = []; let list = false;
    for (const line of lines) {
      if (line.startsWith('- ')) { if (!list) { html.push('<ul>'); list = true; } html.push('<li>' + inline(line.slice(2)) + '</li>'); continue; }
      if (list) { html.push('</ul>'); list = false; }
      if (line.startsWith('# ')) html.push('<h1>' + inline(line.slice(2)) + '</h1>');
      else if (line.startsWith('## ')) html.push('<h2>' + inline(line.slice(3)) + '</h2>');
      else if (line.trim()) html.push('<p>' + inline(line) + '</p>');
    }
    if (list) html.push('</ul>'); setOutput(html.join('\n'));
  };

  return (
    <div className="space-y-4">
      <textarea value={input} onChange={e => setInput(e.target.value)} className="w-full h-56 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
      <button onClick={convert} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Convert to HTML</button>
      {output && (
        <div className="overflow-x-auto no-scrollbar space-y-3">
          <textarea readOnly value={output} className="w-full h-64 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 font-mono text-base" />
          <ExportActions content={output} filename="orbitboard.html" />
        </div>
      )}
    </div>
  );
}
