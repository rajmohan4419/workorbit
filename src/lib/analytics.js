const MEASUREMENT_ID = 'G-SLWFZLY8SC';

let loadPromise;

export function loadGoogleAnalytics() {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve) => {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() {
      window.dataLayer.push(arguments);
    };

    window.gtag('js', new Date());
    window.gtag('config', MEASUREMENT_ID);

    const existing = document.querySelector('script[data-orbitboard-ga]');
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    script.dataset.orbitboardGa = 'true';
    script.onload = resolve;
    script.onerror = resolve;
    document.head.appendChild(script);
  });

  return loadPromise;
}
