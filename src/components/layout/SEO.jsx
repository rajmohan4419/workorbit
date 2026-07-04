import { useEffect } from 'react';

const DEFAULT_TITLE = 'OrbitBoard | Fast, Simple Project Management';
const DEFAULT_DESCRIPTION = 'OrbitBoard is the ultimate project management and team collaboration platform. Built for Indian founders and high-growth teams.';
const DEFAULT_IMAGE = 'https://orbitboard.in/og-image.png';

export default function SEO({ title, description, canonical, image, type = 'website' }) {
  useEffect(() => {
    const previousTitle = document.title;
    const metaDescription = document.querySelector('meta[name="description"]');
    const previousDescription = metaDescription?.getAttribute('content');

    // OG Tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    const ogImage = document.querySelector('meta[property="og:image"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');
    const ogType = document.querySelector('meta[property="og:type"]');

    // Twitter Tags
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    const twitterImage = document.querySelector('meta[name="twitter:image"]');

    let link = document.querySelector('link[rel="canonical"]');
    const previousCanonical = link?.getAttribute('href');

    const fullTitle = title ? `OrbitBoard | ${title}` : DEFAULT_TITLE;
    const fullDescription = description || DEFAULT_DESCRIPTION;
    const fullImage = image || DEFAULT_IMAGE;

    document.title = fullTitle;
    if (metaDescription) metaDescription.setAttribute('content', fullDescription);

    // Update OG
    if (ogTitle) ogTitle.setAttribute('content', fullTitle);
    if (ogDescription) ogDescription.setAttribute('content', fullDescription);
    if (ogImage) ogImage.setAttribute('content', fullImage);
    if (ogUrl && canonical) ogUrl.setAttribute('content', canonical);
    if (ogType) ogType.setAttribute('content', type);

    // Update Twitter
    if (twitterTitle) twitterTitle.setAttribute('content', fullTitle);
    if (twitterDescription) twitterDescription.setAttribute('content', fullDescription);
    if (twitterImage) twitterImage.setAttribute('content', fullImage);

    if (canonical) {
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonical);
    }

    return () => {
      document.title = previousTitle || DEFAULT_TITLE;
      if (metaDescription) metaDescription.setAttribute('content', previousDescription || DEFAULT_DESCRIPTION);

      // We don't necessarily restore all OG tags on every unmount to avoid flickering
      // but the next SEO component will overwrite them anyway.

      if (link) {
        if (previousCanonical) {
          link.setAttribute('href', previousCanonical);
        } else {
          link.remove();
        }
      }
    };
  }, [title, description, canonical, image, type]);

  return null;
}
