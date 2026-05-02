/* eslint-disable no-console */
import path from 'path';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { Track } from '../track/entities/track.entity';
import { Playlist, PlaylistType, ALBUM_TYPES } from '../playlist/entities/playlist.entity';
import { TrackVisibility } from '../track/enums/track-visibility.enum';
import { getIndex } from './client';
import { mapUser, mapTrack, mapPlaylist, mapAlbum } from './indexing';
import { SearchDocument } from './types';

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [path.join(__dirname, '/../**/*.entity.js')],
  synchronize: false,
  logging: false,
  ssl: true,
  extra: {
    ssl: {
      rejectUnauthorized: false,
    },
  },
});

const BATCH_SIZE = 100;

function toBatches<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, (i + 1) * size)
  );
}

async function indexBatched(docs: SearchDocument[]): Promise<void> {
  const index = getIndex();
  await Promise.all(toBatches(docs, BATCH_SIZE).map((batch) => index.addDocuments(batch)));
}

async function reindex() {
  console.log('--- Meilisearch Full Reindex ---\n');

  // -- Connect to Postgres
  await dataSource.initialize();
  console.log('Connected to Postgres.');

  const index = getIndex();

  // -- Wipe the catalog index
  console.log('Clearing catalog index...');
  await index.deleteAllDocuments();
  console.log('Catalog cleared.\n');

  let totalIndexed = 0;

  // -- Users
  console.log('Indexing users...');
  const users = await dataSource.getRepository(User).find({ where: { isPublic: true } });
  const userDocs: SearchDocument[] = users.map(mapUser);
  await indexBatched(userDocs);
  console.log(`  Indexed ${userDocs.length} users.`);
  totalIndexed += userDocs.length;

  // -- Tracks
  console.log('Indexing tracks...');
  const tracks = await dataSource.getRepository(Track).find({
    where: { visibility: TrackVisibility.PUBLIC, hidden: false },
    relations: ['user', 'tags', 'genre'],
  });
  const trackDocs: SearchDocument[] = tracks.map(mapTrack);
  await indexBatched(trackDocs);
  console.log(`  Indexed ${trackDocs.length} tracks.`);
  totalIndexed += trackDocs.length;

  // -- Playlists
  console.log('Indexing playlists...');
  const playlists = await dataSource.getRepository(Playlist).find({
    where: { isPublic: true, type: PlaylistType.PLAYLIST },
    relations: ['user', 'tags', 'genre'],
  });
  const playlistDocs: SearchDocument[] = playlists.map(mapPlaylist);
  await indexBatched(playlistDocs);
  console.log(`  Indexed ${playlistDocs.length} playlists.`);
  totalIndexed += playlistDocs.length;

  // -- Albums (all album sub-types fetched in parallel)
  console.log('Indexing albums...');
  const albumRepo = dataSource.getRepository(Playlist);
  const albumBatches = await Promise.all(
    ALBUM_TYPES.map((albumType) =>
      albumRepo.find({
        where: { isPublic: true, type: albumType },
        relations: ['user', 'tags', 'genre'],
      })
    )
  );
  const albumDocs: SearchDocument[] = albumBatches.flat().map(mapAlbum);
  await indexBatched(albumDocs);
  console.log(`  Indexed ${albumDocs.length} albums.`);
  totalIndexed += albumDocs.length;

  // -- Done
  console.log(`\nReindex complete. Total documents indexed: ${totalIndexed}`);
  await dataSource.destroy();
}

reindex().catch((err) => {
  console.error('Reindex failed:', err);
  process.exit(1);
});
