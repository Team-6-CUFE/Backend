export const UPLOAD_LIMIT_SECONDS: Record<string, number | null> = {
  free: 120 * 60, // 120 minutes
  'go+': 180 * 60, // 180 minutes
  pro: null, // unlimited
};
