// Writes a static HTML file for each live tool so crawlers and link previews
// receive the title, description, structured data and guide text without running JS.
// The same app bundle still loads and takes over on the client.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';

const SITE = 'https://orbitboard.in';
const DIST = path.resolve('dist');

const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const SCHEMA_CATEGORY = {
  Finance: 'FinanceApplication',
  Business: 'BusinessApplication',
  Career: 'BusinessApplication',
  Developer: 'DeveloperApplication',
  Everyday: 'UtilitiesApplication',
};

const CATEGORY_LABEL = {
  Finance: 'Finance',
  Business: 'Business',
  Career: 'Career',
  Developer: 'Developer',
  Everyday: 'Productivity',
};

function headFor(tool, content) {
  const url = `${SITE}/tools/${tool.slug}`;
  const title = `${tool.name} (Free, No Sign-up) | OrbitBoard`;
  const description = tool.description;
  const keywords = content?.keywords || `${tool.name}, free online tool`;
  const faq = content?.faq || [];

  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: tool.name,
      description,
      url,
      applicationCategory: SCHEMA_CATEGORY[tool.category] || 'UtilitiesApplication',
      operatingSystem: 'Any',
      browserRequirements: 'Requires a modern web browser with JavaScript',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      inLanguage: 'en-IN',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: CATEGORY_LABEL[tool.category] || tool.category, item: `${SITE}/tools` },
        { '@type': 'ListItem', position: 3, name: tool.name, item: url },
      ],
    },
  ];
  if (faq.length) {
    ld.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(([q, a]) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    });
  }

  return { url, title, description, keywords, ld };
}

function applyHead(template, h) {
  // Drop the site-wide WebSite block on tool pages; each tool gets its own structured data.
  const template2 = template.replace(/<script type="application\/ld\+json">\s*\{[\s\S]*?"WebSite"[\s\S]*?<\/script>/, '');
  // Replace the homepage canonical so each tool page points to itself.
  const template3 = template2.replace(/<link rel="canonical"[^>]*\/>/, '');
  let out = template3
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(h.title)}</title>`)
    .replace(/<meta name="description"[^>]*\/>/, `<meta name="description" content="${esc(h.description)}" />\n    <meta name="keywords" content="${esc(h.keywords)}" />\n    <link rel="canonical" href="${esc(h.url)}" />`)
    .replace(/<meta property="og:title"[^>]*\/>/, `<meta property="og:title" content="${esc(h.title)}" />`)
    .replace(/<meta property="og:description"[^>]*\/>/, `<meta property="og:description" content="${esc(h.description)}" />`)
    .replace(/<meta property="og:url"[^>]*\/>/, `<meta property="og:url" content="${esc(h.url)}" />`)
    .replace(/<meta name="twitter:title"[^>]*\/>/, `<meta name="twitter:title" content="${esc(h.title)}" />`)
    .replace(/<meta name="twitter:description"[^>]*\/>/, `<meta name="twitter:description" content="${esc(h.description)}" />`);
  // Replace the site-wide WebSite JSON-LD only on the home page; tool pages get their own.
  const ldTags = h.ld.map(obj => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`).join('\n    ');
  out = out.replace('</head>', `    ${ldTags}\n  </head>`);
  return out;
}

function noscriptBody(tool, content) {
  const how = (content?.how || []).map(s => `<li>${esc(s)}</li>`).join('');
  const faq = (content?.faq || []).map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('');
  return `<noscript><main><h1>${esc(tool.name)}</h1><p>${esc(content?.intro || tool.description)}</p>${how ? `<h2>How to use it</h2><ol>${how}</ol>` : ''}${faq ? `<h2>Questions</h2>${faq}` : ''}<p><a href="/tools">Browse all free tools</a></p></main></noscript>`;
}

async function main() {
  const template = await readFile(path.join(DIST, 'index.html'), 'utf8');

  const server = await createServer({
    root: process.cwd(),
    appType: 'custom',
    logLevel: 'error',
    server: { middlewareMode: true, hmr: false },
  });

  try {
    const { LISTED_TOOLS } = await server.ssrLoadModule('/src/data/toolCatalog.js');
    const { TOOL_CONTENT } = await server.ssrLoadModule('/src/data/toolContent.jsx');

    let written = 0;
    for (const tool of LISTED_TOOLS) {
      const content = TOOL_CONTENT[tool.slug];
      const h = headFor(tool, content);
      const html = applyHead(template, h).replace('<div id="root"></div>', `${noscriptBody(tool, content)}<div id="root"></div>`);
      const dir = path.join(DIST, 'tools', tool.slug);
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, 'index.html'), html, 'utf8');
      written++;
    }
    console.log(`prerendered ${written} tool pages`);
  } finally {
    await server.close();
  }
}

main().catch(err => {
  console.error('prerender failed:', err);
  process.exit(1);
});
