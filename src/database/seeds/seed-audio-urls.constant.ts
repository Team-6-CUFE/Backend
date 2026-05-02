/**
 * Shared S3 URLs used by the track seeder factory.
 * The audio processor checks against this list before deleting old S3 files
 * to prevent accidentally wiping seeded assets during re-processing.
 */
export const SEED_PROTECTED_AUDIO_URLS = new Set<string>([
  'https://harmonica-s3-storage-287109772507-us-east-1-an.s3.amazonaws.com/tracks/4bb04f6f-b570-48b9-a97b-2790795e0d72/WhatsApp_Audio_2026-05-02_at_51805_PM_standard.mp3',
  'https://harmonica-s3-storage-287109772507-us-east-1-an.s3.amazonaws.com/tracks/4bb04f6f-b570-48b9-a97b-2790795e0d72/WhatsApp_Audio_2026-05-02_at_51805_PM_hq.mp3',
  'https://harmonica-s3-storage-287109772507-us-east-1-an.s3.amazonaws.com/tracks/4bb04f6f-b570-48b9-a97b-2790795e0d72/WhatsApp_Audio_2026-05-02_at_51805_PM_preview.mp3',
  'https://harmonica-s3-storage-287109772507-us-east-1-an.s3.amazonaws.com/tracks/4bb04f6f-b570-48b9-a97b-2790795e0d72/waveform.json',
]);
