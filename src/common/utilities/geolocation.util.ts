import * as geoip from 'geoip-lite';

export function getLocationFromIp(ip: string): {
  country: string | null;
  city: string | null;
} {
  const cleaned = ip.replace(/^::ffff:/, '');
  // Use a real Egyptian IP for local development testing
  const testIp = '41.33.0.1'; // Giza, Egypt
  const resolvedIp =
    cleaned === '127.0.0.1' || cleaned === '172.18.0.1' || cleaned === '::1' ? testIp : cleaned;

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
