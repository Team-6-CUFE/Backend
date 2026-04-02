import { setSeederFactory } from 'typeorm-extension';
import { Track } from '../../track/entities/track.entity';
import { TrackStatus } from '../../track/enums/track-status.enum';
import { TrackVisibility } from '../../track/enums/track-visibility.enum';

export default setSeederFactory(Track, async () => {
  const { faker } = await import('@faker-js/faker');
  const track = new Track();

  // Basic Info
  track.title = faker.music.songName();
  track.description = faker.lorem.paragraph();

  // Media URLs
  const trackId = faker.string.uuid();
  track.audioUrl = `https://cdn.soundcloud-clone.com/audio/${trackId}.mp3`;
  track.previewAudioUrl = `https://cdn.soundcloud-clone.com/previews/${trackId}.mp3`;
  track.waveformUrl = `https://cdn.soundcloud-clone.com/waveforms/${trackId}.json`;
  track.coverImage = faker.image.url({ width: 500, height: 500 });

  // Metadata
  track.durationSeconds = faker.number.int({ min: 60, max: 600 });
  track.playCount = faker.number.int({ min: 0, max: 100000 });
  track.likesCount = 0;
  track.repostsCount = 0;
  track.commentsCount = 0;

  // Status & Visibility
  track.trackStatus = faker.helpers.arrayElement(Object.values(TrackStatus)) as TrackStatus;
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
