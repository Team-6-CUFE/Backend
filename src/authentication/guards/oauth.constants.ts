/** Deep-link schemes that are allowed as OAuth redirect_uri values. */
export const ALLOWED_MOBILE_SCHEMES = ['harmonica://'];

/**
 * Validates an OAuth redirect_uri coming from a client.
 * Accepts:
 *  - Registered mobile deep-link schemes (e.g. harmonica://)
 *  - Desktop localhost loopback on any port (http://localhost:<port>/callback
 *    or http://127.0.0.1:<port>/callback) per RFC 8252 §7.3
 */
export function isAllowedRedirectUri(uri: string): boolean {
  if (ALLOWED_MOBILE_SCHEMES.some((scheme) => uri.startsWith(scheme))) return true;

  try {
    const parsed = new URL(uri);
    return (
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
      parsed.pathname === '/callback'
    );
  } catch {
    return false;
  }
}
