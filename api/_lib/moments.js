// Browser-origin guard. The shared rate limiter also protects direct HTTP callers.
export function isSameOrigin(req) {
  const { origin, host } = req.headers;
  const secure = req.headers['x-forwarded-proto'] === 'https' || req.socket?.encrypted;
  return Boolean(host) && origin === `${secure ? 'https' : 'http'}://${host}`;
}
