// scripts/prerender-tools.mjs
// Writes static HTML files for static routes, live tools, and variants so crawlers and link previews
// receive the title, description, structured data, canonical tags, and content without running JS.
// Also generates public/sitemap.xml and dist/sitemap.xml, and emits 404.html with robots noindex.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';

const SITE = 'https://orbitboard.in';
const DIST = path.resolve('dist');
const PUBLIC = path.resolve('public');
const SITEMAP_LASTMOD = '2026-10-31';

const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

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

const STATIC_ROUTES = [
  {
    path: '/',
    distFile: 'index.html',
    title: 'OrbitBoard — Free Online Tools for Work, Money & Developers',
    description:
      'Free online calculators and developer tools for salary, finance, JSON, JWT, Base64, timestamps and everyday work.',
    canonicalUrl: `${SITE}/`,
    keywords: 'free online tools, calculators, salary calculator, emi calculator, developer tools, json formatter',
    changefreq: 'daily',
    priority: '1.0',
    noscript:
      '<noscript><main><h1>OrbitBoard — Free Online Tools for Work, Money & Developers</h1><p>Fast, client-side online tools for finance, career, everyday calculations, and developers.</p><p><a href="/tools">Browse all tools</a></p></main></noscript>',
  },
  {
    path: '/tools',
    distFile: path.join('tools', 'index.html'),
    title: 'All Free Online Tools | OrbitBoard',
    description:
      "Browse OrbitBoard's complete catalogue of free online tools for career, money, everyday tasks, and developers.",
    canonicalUrl: `${SITE}/tools`,
    keywords: 'tool catalogue, free calculators, financial tools, career tools, developer utilities',
    changefreq: 'daily',
    priority: '0.9',
    noscript:
      '<noscript><main><h1>All Free Online Tools</h1><p>Browse OrbitBoard\'s complete catalog of free online tools.</p><p><a href="/">Home</a></p></main></noscript>',
  },
  {
    path: '/about',
    distFile: path.join('about', 'index.html'),
    title: 'About Us | OrbitBoard',
    description:
      'Fast, browser-native web tools designed for daily work, career decisions, finance, and developer productivity.',
    canonicalUrl: `${SITE}/about`,
    keywords: 'about orbitboard, private tools, browser native tools, developer utilities',
    changefreq: 'monthly',
    priority: '0.7',
    noscript:
      '<noscript><main><h1>About Us | OrbitBoard</h1><p>Fast, browser-native web tools designed for daily work, career decisions, finance, and developer productivity.</p><p><a href="/tools">Browse tools</a></p></main></noscript>',
  },
  {
    path: '/contact',
    distFile: path.join('contact', 'index.html'),
    title: 'Contact Us & Support | OrbitBoard',
    description:
      'Get in touch with the OrbitBoard team for support, tool requests, feedback, or business inquiries.',
    canonicalUrl: `${SITE}/contact`,
    keywords: 'contact orbitboard, support, feedback, feature request',
    changefreq: 'monthly',
    priority: '0.7',
    noscript:
      '<noscript><main><h1>Contact Us & Support</h1><p>Get in touch with the OrbitBoard team for support, tool requests, feedback, or business inquiries.</p><p><a href="/tools">Browse tools</a></p></main></noscript>',
  },
  {
    path: '/privacy',
    distFile: path.join('privacy', 'index.html'),
    title: 'Privacy Policy | OrbitBoard',
    description:
      'OrbitBoard is designed with a strict browser-first architecture. Tools execute client-side and your data is never uploaded to our servers.',
    canonicalUrl: `${SITE}/privacy`,
    keywords: 'privacy policy, client side privacy, browser first, data security',
    changefreq: 'monthly',
    priority: '0.5',
    noscript:
      '<noscript><main><h1>Privacy Policy</h1><p>OrbitBoard is designed with a strict browser-first architecture. Tools execute client-side and your data is never uploaded to our servers.</p><p><a href="/tools">Browse tools</a></p></main></noscript>',
  },
  {
    path: '/terms',
    distFile: path.join('terms', 'index.html'),
    title: 'Terms of Service | OrbitBoard',
    description: "Terms of Service for using OrbitBoard's free online tools, converters, and utilities.",
    canonicalUrl: `${SITE}/terms`,
    keywords: 'terms of service, terms of use, legal',
    changefreq: 'monthly',
    priority: '0.5',
    noscript:
      '<noscript><main><h1>Terms of Service</h1><p>Terms of Service for using OrbitBoard\'s free online tools, converters, and utilities.</p><p><a href="/tools">Browse tools</a></p></main></noscript>',
  },
  {
    path: '/pricing',
    distFile: path.join('pricing', 'index.html'),
    title: 'Pricing & Plans | OrbitBoard',
    description:
      'Transparent pricing plans for OrbitBoard Pro and Business with advanced exports and bulk processing.',
    canonicalUrl: `${SITE}/pricing`,
    keywords: 'orbitboard pricing, pro plan, business plan, pricing tiers',
    changefreq: 'weekly',
    priority: '0.8',
    noscript:
      '<noscript><main><h1>Pricing & Plans</h1><p>Transparent pricing plans for OrbitBoard Pro and Business with advanced exports and bulk processing.</p><p><a href="/tools">Browse tools</a></p></main></noscript>',
  },
];

function headForTool(tool, content) {
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
        {
          '@type': 'ListItem',
          position: 2,
          name: CATEGORY_LABEL[tool.category] || tool.category,
          item: `${SITE}/tools`,
        },
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

  return { url, canonicalUrl: url, title, description, keywords, ld };
}

function headForVariant(variant) {
  const url = `${SITE}/tools/${variant.slug}`;
  const title = `${variant.name} (Free, No Sign-up) | OrbitBoard`;
  const description = variant.description;
  const keywords = `${variant.name}, free online calculator, ${variant.baseToolSlug}`;
  const canonicalUrl = variant.canonicalUrl || `${SITE}/tools/${variant.baseToolSlug}`;

  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: variant.name,
      description,
      url,
      applicationCategory: SCHEMA_CATEGORY[variant.category] || 'UtilitiesApplication',
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
        {
          '@type': 'ListItem',
          position: 2,
          name: CATEGORY_LABEL[variant.category] || variant.category,
          item: `${SITE}/tools`,
        },
        { '@type': 'ListItem', position: 3, name: variant.name, item: url },
      ],
    },
  ];

  if (variant.faq && variant.faq.length) {
    ld.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: variant.faq.map(([q, a]) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    });
  }

  return { url, canonicalUrl, title, description, keywords, ld };
}

function applyHead(template, h) {
  let out = template;

  // Drop site-wide WebSite block when custom structured data is provided
  if (h.ld) {
    out = out.replace(/<script type="application\/ld\+json">\s*\{[\s\S]*?"WebSite"[\s\S]*?<\/script>/, '');
  }

  // Canonical tag replacement
  const targetCanonical = h.canonicalUrl || h.url;
  if (targetCanonical) {
    if (out.includes('<link rel="canonical"')) {
      out = out.replace(/<link rel="canonical"[^>]*\/>/, `<link rel="canonical" href="${esc(targetCanonical)}" />`);
    } else {
      out = out.replace('</head>', `    <link rel="canonical" href="${esc(targetCanonical)}" />\n  </head>`);
    }
  }

  // Title tag replacement
  if (h.title) {
    out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(h.title)}</title>`);
  }

  // Description and keywords replacement
  if (h.description) {
    const metaBlock = `<meta name="description" content="${esc(h.description)}" />${
      h.keywords ? `\n    <meta name="keywords" content="${esc(h.keywords)}" />` : ''
    }`;
    if (out.includes('<meta name="description"')) {
      out = out.replace(/<meta name="description"[^>]*\/>/, metaBlock);
    } else {
      out = out.replace('</head>', `    ${metaBlock}\n  </head>`);
    }
  }

  // Robots meta tag
  if (h.robots) {
    if (out.includes('<meta name="robots"')) {
      out = out.replace(/<meta name="robots"[^>]*\/>/, `<meta name="robots" content="${esc(h.robots)}" />`);
    } else {
      out = out.replace('</head>', `    <meta name="robots" content="${esc(h.robots)}" />\n  </head>`);
    }
  }

  // Open Graph & Twitter meta tags
  if (h.title) {
    out = out.replace(/<meta property="og:title"[^>]*\/>/, `<meta property="og:title" content="${esc(h.title)}" />`);
    out = out.replace(/<meta name="twitter:title"[^>]*\/>/, `<meta name="twitter:title" content="${esc(h.title)}" />`);
  }
  if (h.description) {
    out = out.replace(
      /<meta property="og:description"[^>]*\/>/,
      `<meta property="og:description" content="${esc(h.description)}" />`
    );
    out = out.replace(
      /<meta name="twitter:description"[^>]*\/>/,
      `<meta name="twitter:description" content="${esc(h.description)}" />`
    );
  }
  if (targetCanonical) {
    out = out.replace(/<meta property="og:url"[^>]*\/>/, `<meta property="og:url" content="${esc(targetCanonical)}" />`);
  }

  // Inject JSON-LD structured data
  if (h.ld && h.ld.length) {
    const ldTags = h.ld
      .map((obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`)
      .join('\n    ');
    out = out.replace('</head>', `    ${ldTags}\n  </head>`);
  }

  return out;
}

function noscriptBodyForTool(tool, content) {
  const how = (content?.how || []).map((s) => `<li>${esc(s)}</li>`).join('');
  const faq = (content?.faq || []).map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('');
  return `<noscript><main><h1>${esc(tool.name)}</h1><p>${esc(
    content?.intro || tool.description
  )}</p>${how ? `<h2>How to use it</h2><ol>${how}</ol>` : ''}${
    faq ? `<h2>Questions</h2>${faq}` : ''
  }<p><a href="/tools">Browse all free tools</a></p></main></noscript>`;
}

function noscriptBodyForVariant(variant) {
  const faqHtml = (variant.faq || []).map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('');
  return `<noscript><main><h1>${esc(variant.name)}</h1><p>${esc(variant.intro)}</p>${
    faqHtml ? `<h2>Frequently Asked Questions</h2>${faqHtml}` : ''
  }<p><a href="/tools">Browse all free tools</a></p></main></noscript>`;
}

function generateSitemapXml(staticRoutes, liveTools, variants) {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const r of staticRoutes) {
    xml += `  <url>\n    <loc>${r.canonicalUrl}</loc>\n    <lastmod>${SITEMAP_LASTMOD}</lastmod>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>\n`;
  }

  for (const tool of liveTools) {
    xml += `  <url>\n    <loc>${SITE}/tools/${tool.slug}</loc>\n    <lastmod>${SITEMAP_LASTMOD}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  }

  for (const v of variants) {
    xml += `  <url>\n    <loc>${SITE}/tools/${v.slug}</loc>\n    <lastmod>${SITEMAP_LASTMOD}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  }

  xml += `</urlset>\n`;
  return xml;
}

function build404Html(template) {
  const h = {
    title: '404 — Page Not Found | OrbitBoard',
    description: 'Page not found. The tool or page you requested does not exist or has been moved.',
    robots: 'noindex, follow',
    canonicalUrl: `${SITE}/404`,
  };

  const body404 = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fafaf9; color: #1c1917; min-height: 100vh; display: flex; flex-direction: column; justify-content: space-between;">
      <header style="border-bottom: 1px solid #e7e5e4; background: #ffffff; padding: 1rem 1.5rem;">
        <div style="max-width: 1440px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between;">
          <a href="/" style="font-weight: 800; font-size: 1.25rem; color: #1c1917; text-decoration: none;">OrbitBoard</a>
          <a href="/tools" style="font-size: 0.875rem; color: #d97706; text-decoration: none; font-weight: 600;">Browse Tools →</a>
        </div>
      </header>
      <main style="max-width: 48rem; margin: 0 auto; padding: 4rem 1rem; text-align: center;">
        <div style="display: inline-flex; align-items: center; justify-content: center; width: 4rem; height: 4rem; border-radius: 1rem; background: rgba(245, 158, 11, 0.1); color: #d97706; font-family: monospace; font-size: 1.5rem; font-weight: 900; margin-bottom: 1.5rem;">
          404
        </div>
        <h1 style="font-size: 2.25rem; font-weight: 900; letter-spacing: -0.025em; color: #1c1917; margin-bottom: 1rem;">
          Page Not Found
        </h1>
        <p style="font-size: 1.125rem; color: #57534e; max-width: 36rem; margin: 0 auto 2rem auto; line-height: 1.625;">
          The page or tool you are looking for doesn't exist, may have been retired, or is currently under development.
        </p>
        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 1rem;">
          <a href="/tools" style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.25rem; border-radius: 0.75rem; background: #d97706; color: #ffffff; font-weight: 600; font-size: 0.875rem; text-decoration: none; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
            Browse Free Tools →
          </a>
          <a href="/" style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.25rem; border-radius: 0.75rem; border: 1px solid #e7e5e4; background: #ffffff; color: #292524; font-weight: 600; font-size: 0.875rem; text-decoration: none; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
            Homepage
          </a>
        </div>
      </main>
      <footer style="border-top: 1px solid #e7e5e4; background: #ffffff; padding: 1.5rem; text-align: center; font-size: 0.875rem; color: #78716c;">
        © 2026 OrbitBoard. Free browser-first productivity tools.
      </footer>
    </div>
  `;

  let html = applyHead(template, h);
  html = html.replace('<div id="root"></div>', `<div id="root">${body404}</div>`);
  return html;
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

    // Load tool variants from src/data/toolVariants.json
    let variants = [];
    try {
      const variantsRaw = await readFile(path.join(process.cwd(), 'src/data/toolVariants.json'), 'utf8');
      variants = JSON.parse(variantsRaw);
    } catch (e) {
      console.warn('Could not load src/data/toolVariants.json, variants will not be prerendered:', e.message);
    }

    // 1. Prerender Static Routes
    let staticWritten = 0;
    for (const route of STATIC_ROUTES) {
      const html = applyHead(template, {
        url: route.canonicalUrl,
        canonicalUrl: route.canonicalUrl,
        title: route.title,
        description: route.description,
        keywords: route.keywords,
      }).replace('<div id="root"></div>', `${route.noscript}<div id="root"></div>`);

      const targetPath = path.join(DIST, route.distFile);
      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeFile(targetPath, html, 'utf8');
      staticWritten++;
    }
    console.log(`Prerendered ${staticWritten} static routes`);

    // 2. Prerender Live Tools
    let toolsWritten = 0;
    for (const tool of LISTED_TOOLS) {
      const content = TOOL_CONTENT[tool.slug];
      const h = headForTool(tool, content);
      const html = applyHead(template, h).replace(
        '<div id="root"></div>',
        `${noscriptBodyForTool(tool, content)}<div id="root"></div>`
      );
      const dir = path.join(DIST, 'tools', tool.slug);
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, 'index.html'), html, 'utf8');
      toolsWritten++;
    }
    console.log(`Prerendered ${toolsWritten} live tool pages`);

    // 3. Prerender Tool Variants
    let variantsWritten = 0;
    for (const variant of variants) {
      const h = headForVariant(variant);
      const html = applyHead(template, h).replace(
        '<div id="root"></div>',
        `${noscriptBodyForVariant(variant)}<div id="root"></div>`
      );
      const dir = path.join(DIST, 'tools', variant.slug);
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, 'index.html'), html, 'utf8');
      variantsWritten++;
    }
    console.log(`Prerendered ${variantsWritten} tool variant pages`);

    // 4. Emit 404.html to dist/ and public/
    const html404 = build404Html(template);
    await writeFile(path.join(DIST, '404.html'), html404, 'utf8');
    await mkdir(PUBLIC, { recursive: true });
    await writeFile(path.join(PUBLIC, '404.html'), html404, 'utf8');
    console.log('Emitted dist/404.html and public/404.html with robots noindex');

    // 5. Generate dynamic sitemap.xml to both public/ and dist/
    const sitemapXml = generateSitemapXml(STATIC_ROUTES, LISTED_TOOLS, variants);
    await writeFile(path.join(PUBLIC, 'sitemap.xml'), sitemapXml, 'utf8');
    await writeFile(path.join(DIST, 'sitemap.xml'), sitemapXml, 'utf8');
    console.log(
      `Generated sitemap.xml with ${
        STATIC_ROUTES.length + LISTED_TOOLS.length + variants.length
      } URLs (lastmod: ${SITEMAP_LASTMOD}) to public/ and dist/`
    );
  } finally {
    await server.close();
  }
}

main().catch((err) => {
  console.error('prerender failed:', err);
  process.exit(1);
});
