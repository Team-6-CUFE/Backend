import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { User } from '../../user/entities/user.entity';
import { Track } from '../../track/entities/track.entity';
import { Playlist, PlaylistType } from '../../playlist/entities/playlist.entity';
import { PlaylistLike } from '../../playlist/entities/playlist-likes.entity';
import { PlaylistRepost } from '../../playlist/entities/playlist-reposts.entity';
import { PlaylistTrack } from '../../playlist/entities/playlist-tracks.entity';
import { Genre } from '../../genre/entities/genre.entity';
import { Activity, ActivityType } from '../../activity/entities/activity.entity';
import { generateVerificationToken } from '../../common/utilities/tokens.util';
import { getIndex } from '../../search/client';

export class PlaylistSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<void> {
    const userRepository = dataSource.getRepository(User);
    const trackRepository = dataSource.getRepository(Track);
    const playlistRepository = dataSource.getRepository(Playlist);
    const playlistLikeRepository = dataSource.getRepository(PlaylistLike);
    const playlistRepostRepository = dataSource.getRepository(PlaylistRepost);
    const playlistTrackRepository = dataSource.getRepository(PlaylistTrack);
    const genreRepository = dataSource.getRepository(Genre);
    const activityRepository = dataSource.getRepository(Activity);

    const existingPlaylists = await playlistRepository.count();
    if (existingPlaylists > 0) {
      console.log('Playlists already seeded. Skipping...');
      return;
    }

    const users = await userRepository.find();
    const tracks = await trackRepository.find();
    const genres = await genreRepository.find();

    if (users.length === 0 || tracks.length === 0 || genres.length === 0) {
      console.log('Missing Users, Tracks, or Genres. Please seed them first.');
      return;
    }

    // --- SEED TAGS ---
    const tagNames = [
      'chill',
      'lo-fi',
      'edm',
      'house',
      'hip-hop',
      'jazz',
      'pop',
      'rock',
      'workout',
      'study',
      'vibes',
    ];
    const tags: Genre[] = [];
    for (const name of tagNames) {
      let tag = await genreRepository.findOne({ where: { name } });
      if (!tag) {
        tag = await genreRepository.save(genreRepository.create({ name }));
      }
      tags.push(tag);
    }

    const createPermalink = (title: string) =>
      `${title.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).substring(2, 7)}`;

    const createPlaylistBase = (overrides: Partial<Playlist>) =>
      playlistRepository.create({
        tracksCount: 0,
        totalDurationSeconds: 0,
        likesCount: 0,
        repostsCount: 0,
        type: PlaylistType.PLAYLIST,
        releaseDate: new Date(),
        buyLink: 'https://bandcamp.com',
        recordLabel: 'Harmonica Records',
        genreId: genres[0].genreId,
        ...overrides,
      });

    const allCreatedPlaylists: { playlist: Playlist; owner: User }[] = [];
    const artist1 = users.find((u) => u.username === 'artist1');
    const index = getIndex();

    if (artist1) {
      const p1 = await playlistRepository.save(
        createPlaylistBase({
          title: 'Late Night Lo-Fi Beats',
          permalink: 'late-night-lofi',
          type: PlaylistType.ALBUM,
          genreId:
            genres.find((g) => g.name.toLowerCase().includes('lo-fi'))?.genreId ||
            genres[0].genreId,
          isPublic: true,
          userId: artist1.userId,
          tags: [tags.find((t) => t.name === 'lo-fi')!, tags.find((t) => t.name === 'chill')!],
        })
      );
      await index.addDocuments([
        {
          id: `album_${p1.playlistId}`,
          type: 'album',
          title: p1.title,
          artist_name: artist1.displayName,
          tags: p1.tags?.map((t) => t.name),
          genre: p1.genre?.name,
        },
      ]);
      allCreatedPlaylists.push({ playlist: p1, owner: artist1 });

      const p2 = await playlistRepository.save(
        createPlaylistBase({
          title: 'Unreleased Demos (Private)',
          permalink: 'unreleased-demos',
          type: PlaylistType.EP,
          isPublic: false,
          secretToken: generateVerificationToken(),
          userId: artist1.userId,
          genreId: genres[1].genreId,
          tags: [tags.find((t) => t.name === 'vibes')!],
        })
      );
      allCreatedPlaylists.push({ playlist: p2, owner: artist1 });
    }

    // ─── RANDOM PLAYLISTS ──────────────────────────────────────────
    const playlistFactory = factoryManager.get(Playlist);
    const types = Object.values(PlaylistType);

    for (let i = 0; i < 30; i++) {
      const randomPlaylist = await playlistFactory.make();
      const randomOwner = users[Math.floor(Math.random() * users.length)];
      const randomType = types[Math.floor(Math.random() * types.length)];
      const randomGenre = genres[Math.floor(Math.random() * genres.length)];

      const savedPlaylist = await playlistRepository.save(
        createPlaylistBase({
          ...randomPlaylist,
          title: randomPlaylist.title,
          permalink: createPermalink(randomPlaylist.title),
          type: randomType,
          genreId: randomGenre.genreId,
          secretToken: !randomPlaylist.isPublic ? generateVerificationToken() : null,
          userId: randomOwner.userId,
          tags: [...tags].sort(() => 0.5 - Math.random()).slice(0, 2),
        })
      );

      if (savedPlaylist.isPublic && savedPlaylist.type === PlaylistType.PLAYLIST) {
        await index.addDocuments([
          {
            id: `playlist_${savedPlaylist.playlistId}`,
            type: 'playlist',
            title: savedPlaylist.title,
            artist_name: randomOwner.displayName,
            tags: savedPlaylist.tags?.map((t) => t.name),
            genre: savedPlaylist.genre?.name,
          },
        ]);
      } else if (savedPlaylist.isPublic && savedPlaylist.type !== PlaylistType.STATION) {
        await index.addDocuments([
          {
            id: `album_${savedPlaylist.playlistId}`,
            type: 'album',
            title: savedPlaylist.title,
            artist_name: randomOwner.displayName,
            tags: savedPlaylist.tags?.map((t) => t.name),
            genre: savedPlaylist.genre?.name,
          },
        ]);
      }
      allCreatedPlaylists.push({ playlist: savedPlaylist, owner: randomOwner });
    }

    // ─── SEED playlist_posted ACTIVITIES ──────────────────────────
    let totalActivitiesCreated = 0;

    for (const { playlist, owner } of allCreatedPlaylists) {
      await activityRepository.save(
        activityRepository.create({
          activityType: ActivityType.PLAYLIST_POSTED,
          targetId: playlist.playlistId,
          userId: owner.userId,
          targetUserId: null,
        })
      );
      totalActivitiesCreated++;
    }

    // ─── POPULATE TRACKS, LIKES, REPOSTS ──────────────────────────
    for (const { playlist, owner } of allCreatedPlaylists) {
      const numTracks = Math.floor(Math.random() * 5) + 3;
      const selectedTracks = [...tracks].sort(() => 0.5 - Math.random()).slice(0, numTracks);

      for (let i = 0; i < selectedTracks.length; i++) {
        await playlistTrackRepository.save({
          playlistId: playlist.playlistId,
          trackId: selectedTracks[i].trackId,
          position: i + 1,
        });
      }

      // --- Seed Likes + playlist_like activities ---
      const numLikes = Math.floor(Math.random() * 5);
      const likers = [...users].sort(() => 0.5 - Math.random()).slice(0, numLikes);
      for (const liker of likers) {
        await playlistLikeRepository.save({
          playlistId: playlist.playlistId,
          userId: liker.userId,
        });

        await activityRepository.save(
          activityRepository.create({
            activityType: ActivityType.PLAYLIST_LIKE,
            targetId: playlist.playlistId,
            userId: liker.userId,
            targetUserId: owner.userId,
          })
        );
        totalActivitiesCreated++;
      }

      // --- Seed Reposts + playlist_repost activities ---
      const numReposts = Math.floor(Math.random() * 3);
      const reposters = [...users].sort(() => 0.5 - Math.random()).slice(0, numReposts);
      for (const reposter of reposters) {
        await playlistRepostRepository.save({
          playlistId: playlist.playlistId,
          userId: reposter.userId,
        });

        await activityRepository.save(
          activityRepository.create({
            activityType: ActivityType.PLAYLIST_REPOST,
            targetId: playlist.playlistId,
            userId: reposter.userId,
            targetUserId: owner.userId,
          })
        );
        totalActivitiesCreated++;
      }
    }

    console.log(
      `Seeding complete: ${allCreatedPlaylists.length} Playlists with Genre and metadata.`
    );
    console.log(`   - Created ${totalActivitiesCreated} total activities`);
  }
}
