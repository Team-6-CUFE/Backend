import { setSeederFactory } from 'typeorm-extension';
import { TrackRepost } from '../../track/entities/track-reposts.entity';

export default setSeederFactory(TrackRepost, async () => {
  const { faker } = await import('@faker-js/faker');
  const repost = new TrackRepost();

  // 30% chance of having a custom caption for the repost
  repost.caption = faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }) ?? '';
  repost.created_at = faker.date.recent({ days: 60 });

  return repost;
});
