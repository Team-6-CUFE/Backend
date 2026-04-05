export const UPLOAD_LIMIT_SECONDS: Record<string, number | null> = {
  free: 120 * 60, // 120 minutes
  pro: 180 * 60, // 240 minutes
  premium: null, // unlimited
};
