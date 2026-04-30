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
  track.audioUrl =
    'https://harmonica-s3-storage-287109772507-us-east-1-an.s3.amazonaws.com/tracks/594929cf-87b3-4461-a80f-c2572fed8107/u_vld2chgq8f-magma-prod-2025-sample-142bpm-459102_standard.mp3';
  track.previewAudioUrl =
    'https://harmonica-s3-storage-287109772507-us-east-1-an.s3.amazonaws.com/tracks/594929cf-87b3-4461-a80f-c2572fed8107/u_vld2chgq8f-magma-prod-2025-sample-142bpm-459102_preview.mp3';
  track.waveformUrl =
    'https://harmonica-s3-storage-287109772507-us-east-1-an.s3.amazonaws.com/tracks/594929cf-87b3-4461-a80f-c2572fed8107/waveform.json';
  track.coverImage =
    'https://harmonica-s3-storage-287109772507-us-east-1-an.s3.amazonaws.com/transparent-cassete.png';
  track.audioUrlHq =
    'https://harmonica-s3-storage-287109772507-us-east-1-an.s3.amazonaws.com/tracks/594929cf-87b3-4461-a80f-c2572fed8107/u_vld2chgq8f-magma-prod-2025-sample-142bpm-459102_hq.mp3';

  // Metadata
  track.durationSeconds = faker.number.int({ min: 60, max: 600 });
  track.playCount = faker.number.int({ min: 0, max: 100000 });
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
