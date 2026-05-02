import { setSeederFactory } from 'typeorm-extension';
import { Track } from '../../track/entities/track.entity';
import { TrackStatus } from '../../track/enums/track-status.enum';
import { TrackVisibility } from '../../track/enums/track-visibility.enum';
import { SEED_PROTECTED_AUDIO_URLS } from '../seeds/seed-audio-urls.constant';

const [audioUrl, audioUrlHq, previewAudioUrl, waveformUrl] = [...SEED_PROTECTED_AUDIO_URLS];

export default setSeederFactory(Track, async () => {
  const { faker } = await import('@faker-js/faker');
  const track = new Track();

  // Basic Info
  track.title = faker.music.songName();
  track.description = faker.lorem.paragraph();

  // Media URLs — sourced from seed-audio-urls.constant.ts (protected from processor deletion)
  track.audioUrl = audioUrl;
  track.previewAudioUrl = previewAudioUrl;
  track.waveformUrl = waveformUrl;
  track.audioUrlHq = audioUrlHq;
  track.coverImage = faker.image.url({ width: 500, height: 500 });

  // Metadata
  track.durationSeconds = faker.number.int({ min: 60, max: 600 });
  track.playCount = 0;
  track.likesCount = 0;
  track.repostsCount = 0;
  track.commentsCount = 0;

  // Status & Visibility
  track.trackStatus = TrackStatus.FINISHED;
  track.visibility = faker.helpers.weightedArrayElement([
    { weight: 3, value: TrackVisibility.PUBLIC },
    { weight: 1, value: TrackVisibility.PRIVATE },
  ]);
  track.hidden = false;

  // Array data (PostgreSQL array type)
  track.blockedRegions = faker.helpers.arrayElements(['US', 'UK', 'DE', 'FR', 'JP'], {
    min: 0,
    max: 2,
  });

  return track;
});
