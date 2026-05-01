export function resolveAudioUrl(
  track: { audioUrl: string | null; audioUrlHq?: string | null },
  plan?: string
): string | null {
  if ((plan === 'pro' || plan === 'go+') && track.audioUrlHq) return track.audioUrlHq;
  return track.audioUrl ?? null;
}
