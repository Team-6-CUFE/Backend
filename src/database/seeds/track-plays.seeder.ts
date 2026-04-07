import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { User } from '../../user/entities/user.entity';
import { Track } from '../../track/entities/track.entity';
import { Playlist } from '../../playlist/entities/playlist.entity';
import { TrackLikes } from '../../track/entities/track-likes.entity';
import { UserFollow } from '../../followers/entities/user-follows.entity';
import { TrackPlay } from '../../track/entities/track-play.entity';
import {
  RecentlyPlayed,
  RecentlyPlayedItemType,
} from '../../track/entities/recently-played.entity';
import { TrackFirstFan } from '../../track/entities/track-first-fan.entity';

export class TrackPlaysSeeder implements Seeder {
  public async run(dataSource: DataSource, _factoryManager: SeederFactoryManager): Promise<void> {
    const trackPlayRepository = dataSource.getRepository(TrackPlay);
    const recentlyPlayedRepository = dataSource.getRepository(RecentlyPlayed);
    const firstFanRepository = dataSource.getRepository(TrackFirstFan);
    const trackRepository = dataSource.getRepository(Track);
    const userRepository = dataSource.getRepository(User);
    const playlistRepository = dataSource.getRepository(Playlist);
    const likesRepository = dataSource.getRepository(TrackLikes);
    const followsRepository = dataSource.getRepository(UserFollow);

    const existingPlays = await trackPlayRepository.count();
    if (existingPlays > 0) {
      console.log('Track plays already seeded. Skipping...');
      return;
    }

    // Use only known test listeners to keep seed data small and predictable
    const listeners = await userRepository.find({
      where: [{ username: 'listener1' }, { username: 'listener2' }, { username: 'listener3' }],
    });

    const artists = await userRepository.find({
      where: [{ username: 'artist1' }, { username: 'artist2' }],
    });

    if (listeners.length === 0 || artists.length === 0) {
      console.warn('Known test users not found. Run UserSeeder first.');
      return;
    }

    // Use only 3 tracks per artist (first ones found)
    const tracks: Track[] = [];
    for (const artist of artists) {
      const artistTracks = await trackRepository.find({
        where: { userId: artist.userId },
        take: 3,
      });
      tracks.push(...artistTracks);
    }

    if (tracks.length === 0) {
      console.warn('No tracks found. Run TrackSeeder first.');
      return;
    }

    const playlists = await playlistRepository.find({ take: 3 });

    console.log(
      `Seeding track plays for ${listeners.length} listeners across ${tracks.length} tracks...`
    );

    const allPlays: Partial<TrackPlay>[] = [];
    // Track most recent play per (user → artist) and (user → playlist) for recently_played
    const artistLatestPlay = new Map<string, Map<string, Date>>();
    const playlistLatestPlay = new Map<string, Map<string, Date>>();

    for (const track of tracks) {
      const releaseDate = track.releaseDate
        ? new Date(track.releaseDate)
        : new Date(track.createdAt);

      for (const listener of listeners) {
        // 3 plays per listener per track: 1 guaranteed within the 7-day window, 2 after
        const windowEnd = new Date(releaseDate.getTime() + 7 * 24 * 60 * 60 * 1000);

        const playTimes: Date[] = [
          // Early play — within first 7 days
          new Date(releaseDate.getTime() + Math.random() * 6 * 24 * 60 * 60 * 1000),
          // Two later plays
          new Date(windowEnd.getTime() + Math.random() * 10 * 24 * 60 * 60 * 1000),
          new Date(windowEnd.getTime() + Math.random() * 20 * 24 * 60 * 60 * 1000),
        ];

        for (const playedAt of playTimes) {
          const playlist =
            playlists.length > 0 && Math.random() < 0.4
              ? playlists[Math.floor(Math.random() * playlists.length)]
              : null;

          allPlays.push({
            trackId: track.trackId,
            userId: listener.userId,
            playedAt,
            playlistId: playlist?.playlistId ?? null,
          });

          // Track latest (user → artist) play
          if (!artistLatestPlay.has(listener.userId))
            artistLatestPlay.set(listener.userId, new Map());
          const aMap = artistLatestPlay.get(listener.userId)!;
          if (!aMap.has(track.userId) || playedAt > aMap.get(track.userId)!) {
            aMap.set(track.userId, playedAt);
          }

          // Track latest (user → playlist) play
          if (playlist) {
            if (!playlistLatestPlay.has(listener.userId))
              playlistLatestPlay.set(listener.userId, new Map());
            const pMap = playlistLatestPlay.get(listener.userId)!;
            if (!pMap.has(playlist.playlistId) || playedAt > pMap.get(playlist.playlistId)!) {
              pMap.set(playlist.playlistId, playedAt);
            }
          }
        }
      }
    }

    await trackPlayRepository.save(allPlays as TrackPlay[]);
    console.log(`  - ${allPlays.length} play records created`);

    // Upsert recently_played — artists
    const artistEntries: Partial<RecentlyPlayed>[] = [];
    for (const [userId, aMap] of artistLatestPlay.entries()) {
      for (const [artistId, playedAt] of aMap.entries()) {
        artistEntries.push({
          userId,
          itemId: artistId,
          itemType: RecentlyPlayedItemType.ARTIST,
          playedAt,
        });
      }
    }
    await recentlyPlayedRepository.upsert(artistEntries, ['userId', 'itemId', 'itemType']);
    console.log(`  - ${artistEntries.length} recently played artist entries upserted`);

    // Upsert recently_played — playlists
    const playlistEntries: Partial<RecentlyPlayed>[] = [];
    for (const [userId, pMap] of playlistLatestPlay.entries()) {
      for (const [playlistId, playedAt] of pMap.entries()) {
        playlistEntries.push({
          userId,
          itemId: playlistId,
          itemType: RecentlyPlayedItemType.PLAYLIST,
          playedAt,
        });
      }
    }
    if (playlistEntries.length > 0) {
      await recentlyPlayedRepository.upsert(playlistEntries, ['userId', 'itemId', 'itemType']);
      console.log(`  - ${playlistEntries.length} recently played playlist entries upserted`);
    }

    // Compute track_first_fans
    // Qualification: played within 7 days of release + follows artist + liked track + has avatarUrl
    console.log('  Computing first fans...');

    const allLikes = await likesRepository.find();
    const allFollows = await followsRepository.find();
    const likeSet = new Set(allLikes.map((l) => `${l.userId}:${l.trackId}`));
    const followSet = new Set(allFollows.map((f) => `${f.follower}:${f.followed}`));

    const firstFanEntries: Partial<TrackFirstFan>[] = [];

    for (const track of tracks) {
      const releaseDate = track.releaseDate
        ? new Date(track.releaseDate)
        : new Date(track.createdAt);
      const windowEnd = new Date(releaseDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Users who played this track within the first 7 days
      const earlyPlays = allPlays.filter(
        (p) => p.trackId === track.trackId && p.playedAt! <= windowEnd
      );
      const earlyPlayerIds = [...new Set(earlyPlays.map((p) => p.userId!))];

      const qualified = earlyPlayerIds.filter((userId) => {
        const user = listeners.find((u) => u.userId === userId);
        return (
          user?.avatarUrl &&
          followSet.has(`${userId}:${track.userId}`) &&
          likeSet.has(`${userId}:${track.trackId}`)
        );
      });

      if (qualified.length === 0) continue;

      // All-time play count per qualified user for this track
      const playCountMap = new Map<string, number>();
      for (const play of allPlays.filter((p) => p.trackId === track.trackId)) {
        if (qualified.includes(play.userId!)) {
          playCountMap.set(play.userId!, (playCountMap.get(play.userId!) ?? 0) + 1);
        }
      }

      const top5 = [...playCountMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

      for (const [userId, playCount] of top5) {
        firstFanEntries.push({ trackId: track.trackId, userId, playCount });
      }
    }

    if (firstFanEntries.length > 0) {
      await firstFanRepository.save(firstFanEntries);
      console.log(`  - ${firstFanEntries.length} first fan records saved`);
    } else {
      console.log('  - No first fans qualified (listeners may lack avatarUrl, follows, or likes)');
    }

    console.log('Track plays seeding complete!');
  }
}
