import * as geoip from 'geoip-lite';

export function getLocationFromIp(ip: string): {
  country: string | null;
  city: string | null;
} {
  // Use a real Egyptian IP for local development testing
  const testIp = '41.33.0.1'; // Giza, Egypt
  const resolvedIp = ip === '127.0.0.1' || ip === '::1' ? testIp : ip.replace(/^::ffff:/, '');

  const geo = geoip.lookup(resolvedIp);
  if (!geo) {
    return { country: null, city: null };
  }
  const countryName =
    new Intl.DisplayNames(['en'], { type: 'region' }).of(geo.country) ?? geo.country;
  return {
    country: countryName ?? null,
    city: geo.city ?? null,
  };
}
