import { useEffect } from 'react';

const DEFAULT_TITLE = 'OrbitBoard | Fast, Simple Project Management';
const DEFAULT_DESCRIPTION = 'OrbitBoard is the ultimate project management and team collaboration platform.';

export default function SEO({ title, description, canonical }) {
  useEffect(() => {
    const previousTitle = document.title;
    const metaDescription = document.querySelector('meta[name="description"]');
    const previousDescription = metaDescription?.getAttribute('content');

    let link = document.querySelector('link[rel="canonical"]');
    const previousCanonical = link?.getAttribute('href');

    if (title) {
      document.title = `OrbitBoard | ${title}`;
    }

    if (description && metaDescription) {
      metaDescription.setAttribute('content', description);
    }

    if (canonical) {
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonical);
    }

    return () => {
      // Restore previous values or set to defaults on unmount
      document.title = previousTitle || DEFAULT_TITLE;
      if (metaDescription && previousDescription) {
        metaDescription.setAttribute('content', previousDescription);
      } else if (metaDescription) {
        metaDescription.setAttribute('content', DEFAULT_DESCRIPTION);
      }

      if (link) {
        if (previousCanonical) {
          link.setAttribute('href', previousCanonical);
        } else {
          link.remove();
        }
      }
    };
  }, [title, description, canonical]);

  return null;
}
