import { setSeederFactory } from 'typeorm-extension';
import { TrackLikes } from '../../track/entities/track-likes.entity';

export default setSeederFactory(TrackLikes, async () => {
  const { faker } = await import('@faker-js/faker');
  const like = new TrackLikes();

  // Only generate the timestamp.
  // user_id and track_id MUST be provided via .save() in the seeder
  like.created_at = faker.date.recent({ days: 30 });

  return like;
});
