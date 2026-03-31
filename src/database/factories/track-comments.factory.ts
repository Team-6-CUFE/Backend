import { setSeederFactory } from 'typeorm-extension';
import { TrackComment } from '../../track/entities/track-comments.entity';

export default setSeederFactory(TrackComment, async () => {
  const { faker } = await import('@faker-js/faker');
  const comment = new TrackComment();

  comment.commentId = faker.string.uuid();
  comment.content = faker.lorem.sentences({ min: 1, max: 3 });

  // Random time within a typical song (0 to 300 seconds)
  comment.timestampSeconds = faker.number.int({ min: 0, max: 300 });
  comment.parentId = null;

  return comment;
});
