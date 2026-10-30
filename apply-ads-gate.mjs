import fs from 'fs';

const ADS_LINE = 'google.com, pub-9160921653901381, DIRECT, f08c47fec0942fa0';

// 1. ads.txt: add the line without removing anything already there
const adsPath = 'public/ads.txt';
const existing = fs.existsSync(adsPath) ? fs.readFileSync(adsPath, 'utf8') : '';
if (!existing.split(/\r?\n/).some(l => l.trim() === ADS_LINE)) {
    const sep = existing && !existing.endsWith('\n') ? '\n' : '';
    fs.writeFileSync(adsPath, existing + sep + ADS_LINE + '\n');
    console.log('ads.txt: line added');
} else {
    console.log('ads.txt: line already present');
}

// 2. ToolPage.jsx: gate the offer card and AdSense on eligibility
const file = 'src/pages/ToolPage.jsx';
let src = fs.readFileSync(file, 'utf8');
const once = (needle, label) => {
    const n = src.split(needle).length - 1;
    if (n !== 1) throw new Error(`ToolPage.jsx: "${label}" found ${n} times, expected 1. Send me: grep -n "SampleAd\\|}[slug]\\|isAdEligible" ${file}`);
};

if (src.includes('isAdEligible')) {
    console.log('ToolPage.jsx: already gated, nothing to do');
} else {
    const importAnchor = "import SampleAd from '../components/SampleAd';";
    once(importAnchor, 'SampleAd import');
    src = src.replace(importAnchor, () => importAnchor + "\nimport { isAdEligible, loadAdSense } from '../lib/adsense';");

    const renderAnchor = '<SampleAd category={tool?.category} />';
    once(renderAnchor, 'SampleAd render');
    src = src.replace(renderAnchor, () => '{adEligible && <SampleAd category={tool?.category} />}');

    // The eligibility check must come after the tool registry (the content map) is defined.
    const registryEnd = '}[slug]), [slug]);';
    once(registryEnd, 'end of the tool registry');
    const block = `

  const adEligible = isAdEligible({ tool, info, hasTool: Boolean(content) });

  useEffect(() => {
    if (adEligible) loadAdSense();
  }, [adEligible]);`;
    src = src.replace(registryEnd, () => registryEnd + block);

    fs.writeFileSync(file, src);
    console.log('ToolPage.jsx: gated');
}