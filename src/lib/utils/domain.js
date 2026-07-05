export const MARKETING_DOMAIN = 'orbitboard.in';
export const APP_DOMAIN = 'app.orbitboard.in';

export const isProduction = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');

export const isAppSubdomain = isProduction
  ? window.location.hostname === APP_DOMAIN
  : window.location.hostname.startsWith('app.');

export const isMarketingDomain = isProduction
  ? (window.location.hostname === MARKETING_DOMAIN || window.location.hostname === `www.${MARKETING_DOMAIN}`)
  : (!window.location.hostname.startsWith('app.') && (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')));

export const getAppUrl = (path = '') => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!isProduction) {
    return `http://app.localhost:5173${cleanPath}`;
  }
  return `https://${APP_DOMAIN}${cleanPath}`;
};

export const getMarketingUrl = (path = '') => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!isProduction) {
    return `http://localhost:5173${cleanPath}`;
  }
  return `https://${MARKETING_DOMAIN}${cleanPath}`;
};

export const redirectToApp = (path = '') => {
  window.location.href = getAppUrl(path);
};

export const redirectToMarketing = (path = '') => {
  window.location.href = getMarketingUrl(path);
};
