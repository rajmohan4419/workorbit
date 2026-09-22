import { useEffect } from 'react';

const DEFAULT_TITLE = 'OrbitBoard — Practical Online Tools for Work & Life';
const DEFAULT_DESCRIPTION = 'Free online calculators, converters, PDF tools, file utilities and developer tools for work and everyday tasks.';
const DEFAULT_IMAGE = 'https://orbitboard.in/og-image.png';

function setMeta(attribute, key, content) {
  if (!content) return;
  let meta = document.querySelector(`meta[${attribute}="${key}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, key);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

export default function SEO({
  title,
  description,
  canonical,
  image = DEFAULT_IMAGE,
  type = 'website',
}) {
  useEffect(() => {
    const fullTitle = title || DEFAULT_TITLE;
    const fullDescription = description || DEFAULT_DESCRIPTION;
    const fullCanonical = canonical || window.location.href;

    document.title = fullTitle;

    setMeta('name', 'description', fullDescription);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', fullDescription);
    setMeta('property', 'og:image', image);
    setMeta('property', 'og:url', fullCanonical);
    setMeta('property', 'og:type', type);
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', fullDescription);
    setMeta('name', 'twitter:image', image);

    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', fullCanonical);

    return undefined;
  }, [title, description, canonical, image, type]);

  return null;
}
