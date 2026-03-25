import { setSeederFactory } from 'typeorm-extension';
import { Track } from '../../track/entities/track.entity';
import { TrackStatus } from '../../track/enums/track-status.enum';

export default setSeederFactory(Track, async () => {
  const { faker } = await import('@faker-js/faker');
  const track = new Track();

  // Basic Info
  track.title = faker.music.songName();
  track.description = faker.lorem.paragraph();

  // Media URLs
  const trackId = faker.string.uuid();
  track.audio_url = `https://cdn.soundcloud-clone.com/audio/${trackId}.mp3`;
  track.preview_audio_url = `https://cdn.soundcloud-clone.com/previews/${trackId}.mp3`;
  track.waveform_url = `https://cdn.soundcloud-clone.com/waveforms/${trackId}.json`;
  track.cover_image = faker.image.url({ width: 500, height: 500 });

  // Metadata
  track.duration_seconds = faker.number.int({ min: 60, max: 600 });
  track.play_count = faker.number.int({ min: 0, max: 100000 });
  track.likes_count = 0;
  track.reposts_count = 0;
  track.comments_count = 0;

  // Status & Visibility
  track.track_status = faker.helpers.arrayElement(Object.values(TrackStatus)) as TrackStatus;
  track.is_public = faker.helpers.arrayElement([true, true, true, false]); // 75% chance public
  track.hidden = false;

  // Array data (PostgreSQL array type)
  track.blocked_regions = faker.helpers.arrayElements(['US', 'UK', 'DE', 'FR', 'JP'], {
    min: 0,
    max: 2,
  });

  return track;
});
