import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {TOOLS,LISTED_TOOLS,SLUG_REDIRECTS} from './toolCatalog.js';
import planned from '../../docs/planning/unreleased-tools.json';
import retired from '../../docs/planning/retired-routes.json';
import config from '../../vercel.json';
import variants from './toolVariants.json';
describe('public catalogue availability',()=>{
  it('has a live implementation for every public tool and no placeholder entries',()=>{
    const source=fs.readFileSync('src/pages/ToolPage.jsx','utf8');
    expect(TOOLS).toEqual(LISTED_TOOLS);
    expect(new Set(TOOLS.map(t=>t.slug)).size).toBe(TOOLS.length);
    for(const tool of TOOLS) {
      expect(tool.status).toBe('live');
      if(tool.slug!=='wishes-studio') expect(source).toContain(`'${tool.slug}':`);
    }
    expect(TOOLS.some(t=>/market-lab|business-portal/.test(t.slug))).toBe(false);
  });
  it('sends unavailable routes to noindex and genuine aliases to live canonical tools',()=>{
    for(const idea of planned) expect(TOOLS.some(t=>t.slug===idea.slug)).toBe(false);
    const headers=config.headers.filter(h=>h.source.startsWith('/tools/:slug('));
    for(const slug of retired) expect(headers.some(h=>h.source.includes(slug)&&h.headers.some(v=>v.key==='X-Robots-Tag'&&v.value.includes('noindex')))).toBe(true);
    for(const [alias,canonical] of Object.entries(SLUG_REDIRECTS)) {
      expect(TOOLS.some(t=>t.slug===alias)).toBe(false);
      expect(TOOLS.some(t=>t.slug===canonical)).toBe(true);
      expect(config.redirects).toContainEqual({source:`/tools/${alias}`,destination:`/tools/${canonical}`,permanent:true});
    }
  });
  it('uses unique canonical sitemap URLs and prerenders every live route with its canonical',()=>{
    const sitemap=fs.readFileSync('public/sitemap.xml','utf8');
    const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.length).toBe(7+LISTED_TOOLS.length+variants.length);
    for(const tool of TOOLS) expect(fs.readFileSync(`dist/tools/${tool.slug}/index.html`,'utf8')).toContain(`rel="canonical" href="https://orbitboard.in/tools/${tool.slug}"`);
    for(const alias of Object.keys(SLUG_REDIRECTS)) expect(urls).not.toContain(`https://orbitboard.in/tools/${alias}`);
  });
});
