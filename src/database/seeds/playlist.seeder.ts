import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { User } from '../../user/entities/user.entity';
import { Track } from '../../track/entities/track.entity';
import { Playlist } from '../../playlist/entities/playlist.entity';
import { PlaylistLike } from '../../playlist/entities/playlist-likes.entity';
import { PlaylistRepost } from '../../playlist/entities/playlist-reposts.entity';
import { PlaylistTrack } from '../../playlist/entities/playlist-tracks.entity';
import { Tag } from '../../track/entities/tag.entity';
import { generateVerificationToken } from '../../common/utilities/tokens.util';

export class PlaylistSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<void> {
    const userRepository = dataSource.getRepository(User);
    const trackRepository = dataSource.getRepository(Track);
    const playlistRepository = dataSource.getRepository(Playlist);
    const playlistLikeRepository = dataSource.getRepository(PlaylistLike);
    const playlistRepostRepository = dataSource.getRepository(PlaylistRepost);
    const playlistTrackRepository = dataSource.getRepository(PlaylistTrack);
    const tagRepository = dataSource.getRepository(Tag);

    const existingPlaylists = await playlistRepository.count();
    if (existingPlaylists > 0) {
      console.log('Playlists already seeded. Skipping...');
      return;
    }

    const users = await userRepository.find();
    const tracks = await trackRepository.find();

    if (users.length === 0 || tracks.length === 0) {
      console.log('Missing Users or Tracks. Please seed them first.');
      return;
    }

    // ─── SEED TAGS ────────────────────────────────────────────────
    console.log('Seeding tags...');
    const tagNames = [
      'chill',
      'lo-fi',
      'edm',
      'house',
      'hip-hop',
      'jazz',
      'classical',
      'ambient',
      'pop',
      'rock',
      'rnb',
      'electronic',
      'acoustic',
      'indie',
      'workout',
      'study',
      'sleep',
      'party',
      'summer',
      'vibes',
    ];

    const tags: Tag[] = [];
    for (const name of tagNames) {
      // upsert — create only if it doesn't already exist
      let tag = await tagRepository.findOne({ where: { name } });
      if (!tag) {
        tag = await tagRepository.save(tagRepository.create({ name }));
      }
      tags.push(tag);
    }
    console.log(`${tags.length} tags ready.`);
    // ──────────────────────────────────────────────────────────────

    console.log('Seeding playlists and adding tracks...');

    const playlistFactory = factoryManager.get(Playlist);
    const allCreatedPlaylists: Playlist[] = [];

    const artist1 = users.find((u) => u.username === 'artist1');
    const artist2 = users.find((u) => u.username === 'artist2');

    const createPlaylistBase = (overrides: Partial<Playlist>) =>
      playlistRepository.create({
        tracksCount: 0,
        totalDurationSeconds: 0,
        likesCount: 0,
        repostsCount: 0,
        ...overrides,
      });

    if (artist1) {
      const p1 = await playlistRepository.save(
        createPlaylistBase({
          title: 'Late Night Lo-Fi Beats',
          description: 'Chill beats to study and relax to.',
          isPublic: true,
          secretToken: null,
          userId: artist1.userId,
          tags: [
            tags.find((t) => t.name === 'lo-fi')!,
            tags.find((t) => t.name === 'chill')!,
            tags.find((t) => t.name === 'study')!,
          ],
        })
      );
      allCreatedPlaylists.push(p1);

      const p2 = await playlistRepository.save(
        createPlaylistBase({
          title: 'Unreleased Demos (Private)',
          description: 'WIP tracks.',
          isPublic: false,
          secretToken: generateVerificationToken(),
          userId: artist1.userId,
          tags: [tags.find((t) => t.name === 'indie')!, tags.find((t) => t.name === 'acoustic')!],
        })
      );
      allCreatedPlaylists.push(p2);
    }

    if (artist2) {
      const p3 = await playlistRepository.save(
        createPlaylistBase({
          title: 'Summer Festival Mix',
          description: 'High energy EDM and House.',
          isPublic: true,
          secretToken: null,
          userId: artist2.userId,
          tags: [
            tags.find((t) => t.name === 'edm')!,
            tags.find((t) => t.name === 'house')!,
            tags.find((t) => t.name === 'party')!,
            tags.find((t) => t.name === 'summer')!,
          ],
        })
      );
      allCreatedPlaylists.push(p3);
    }

    for (let i = 0; i < 30; i++) {
      const randomPlaylist = await playlistFactory.make();
      const randomOwner = users[Math.floor(Math.random() * users.length)];
      const generatedToken = !randomPlaylist.isPublic ? generateVerificationToken() : null;

      // assign 1-3 random tags to each random playlist
      const randomTags = [...tags]
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.floor(Math.random() * 3) + 1);

      const savedPlaylist = await playlistRepository.save(
        createPlaylistBase({
          ...randomPlaylist,
          secretToken: generatedToken,
          userId: randomOwner.userId,
          user: randomOwner,
          tags: randomTags,
        })
      );
      allCreatedPlaylists.push(savedPlaylist);
    }

    console.log('Populating tracks, likes, and reposts...');

    for (const playlist of allCreatedPlaylists) {
      // 1. ADD TRACKS
      const numTracks = Math.floor(Math.random() * 8) + 5;
      const selectedTracks = [...tracks].sort(() => 0.5 - Math.random()).slice(0, numTracks);

      for (let i = 0; i < selectedTracks.length; i++) {
        await playlistTrackRepository.save({
          playlistId: playlist.playlistId,
          trackId: selectedTracks[i].trackId,
          position: i + 1,
        });
      }

      // 2. GENERATE LIKES
      const numLikes = Math.floor(Math.random() * 16);
      const likers = [...users].sort(() => 0.5 - Math.random()).slice(0, numLikes);

      for (const liker of likers) {
        await playlistLikeRepository.save({
          playlistId: playlist.playlistId,
          userId: liker.userId,
        });
      }

      // 3. GENERATE REPOSTS
      const numReposts = Math.floor(Math.random() * 6);
      const reposters = [...users].sort(() => 0.5 - Math.random()).slice(0, numReposts);

      for (const reposter of reposters) {
        await playlistRepostRepository.save({
          playlistId: playlist.playlistId,
          userId: reposter.userId,
        });
      }
    }

    console.log('Seeding complete!');
    console.log(` - ${allCreatedPlaylists.length} Playlists created.`);
    console.log(` - ${tags.length} Tags seeded and assigned.`);
    console.log(` - Secret tokens generated for private playlists.`);
    console.log(` - Triggers automatically updated totalDurationSeconds and tracks_count.`);
  }
}
