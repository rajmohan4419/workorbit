export const MARKETING_DOMAIN = 'orbitboard.in';
export const APP_DOMAIN = 'app.orbitboard.in';

const getHostname = () => {
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    return window.location.hostname;
  }
  return '';
};

export const checkIsProduction = (hostname = getHostname()) => {
  if (!hostname) return false;
  return !hostname.includes('localhost') && !hostname.includes('127.0.0.1');
};

export const checkIsAppSubdomain = (hostname = getHostname()) => {
  const prod = checkIsProduction(hostname);
  return prod
    ? hostname === APP_DOMAIN
    : hostname.startsWith('app.');
};

export const checkIsMarketingDomain = (hostname = getHostname()) => {
  const prod = checkIsProduction(hostname);
  if (prod) {
    return hostname === MARKETING_DOMAIN || hostname === `www.${MARKETING_DOMAIN}`;
  }
  return !hostname.startsWith('app.') && (hostname.includes('localhost') || hostname.includes('127.0.0.1'));
};

export const isProduction = typeof window !== 'undefined' && window.location ? checkIsProduction() : false;
export const isAppSubdomain = typeof window !== 'undefined' && window.location ? checkIsAppSubdomain() : false;
export const isMarketingDomain = typeof window !== 'undefined' && window.location ? checkIsMarketingDomain() : false;

export const getAppUrl = (path = '', options = {}) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const isProdMode = options.isProd !== undefined ? options.isProd : checkIsProduction();
  if (!isProdMode) {
    return `http://app.localhost:5173${cleanPath}`;
  }
  return `https://${APP_DOMAIN}${cleanPath}`;
};

export const getMarketingUrl = (path = '', options = {}) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const isProdMode = options.isProd !== undefined ? options.isProd : checkIsProduction();
  if (!isProdMode) {
    return `http://localhost:5173${cleanPath}`;
  }
  return `https://${MARKETING_DOMAIN}${cleanPath}`;
};

export const redirectToApp = (path = '', targetWindow = typeof window !== 'undefined' ? window : null) => {
  const url = getAppUrl(path);
  if (targetWindow && targetWindow.location) {
    targetWindow.location.href = url;
  }
  return url;
};

export const redirectToMarketing = (path = '', targetWindow = typeof window !== 'undefined' ? window : null) => {
  const url = getMarketingUrl(path);
  if (targetWindow && targetWindow.location) {
    targetWindow.location.href = url;
  }
  return url;
};
