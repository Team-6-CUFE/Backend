import { setSeederFactory } from 'typeorm-extension';
import { Playlist } from '../../playlist/entities/playlist.entity';

export default setSeederFactory(Playlist, (faker) => {
  const playlist = new Playlist();
  const adjective = faker.word.adjective();
  const genre = faker.music.genre();
  const formattedAdjective = adjective.charAt(0).toUpperCase() + adjective.slice(1);
  playlist.title = `${formattedAdjective} ${genre} Vibes`;
  playlist.description =
    faker.helpers.maybe(() => faker.lorem.sentences(2), { probability: 0.7 }) ?? '';
  playlist.cover_image = faker.image.url({ width: 500, height: 500 });
  playlist.is_public = faker.datatype.boolean({ probability: 0.85 });
  return playlist;
});
