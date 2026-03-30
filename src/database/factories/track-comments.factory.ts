import { setSeederFactory } from 'typeorm-extension';
import { TrackComment } from '../../track/entities/track-comments.entity';

export default setSeederFactory(TrackComment, async () => {
  const { faker } = await import('@faker-js/faker');
  const comment = new TrackComment();

  comment.comment_id = faker.string.uuid();
  comment.content = faker.lorem.sentences({ min: 1, max: 3 });

  // Random time within a typical song (0 to 300 seconds)
  comment.timestamp_seconds = faker.number.int({ min: 0, max: 300 });

  return comment;
});
