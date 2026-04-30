import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import * as bcrypt from 'bcrypt';
import { User } from '../../user/entities/user.entity';
import { UserEmail } from '../../user/entities/user-email.entity';
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
import { Settings } from '../../settings/entities/settings.entity';
import { TrackVisibility } from '../../track/enums/track-visibility.enum';
import { mapUser, addDocuments } from '../../search/indexing';

const AVATAR_URL =
  'https://harmonica-s3-storage-287109772507-us-east-1-an.s3.amazonaws.com/profiles/1f2561b1-adbc-4319-b5bb-53102bb92ab2/avatar_1775521418796.webp';

const DAY_MS = 24 * 60 * 60 * 1000;

// 8 dedicated fan users who meet all top/first fan qualification criteria:
// they follow both artists, like all featured tracks, and have an avatar
const FAN_DEMOS = [
  { username: 'superfan1', email: 'superfan1@test.com', firstName: 'Alex', lastName: 'Rivera' },
  { username: 'superfan2', email: 'superfan2@test.com', firstName: 'Jordan', lastName: 'Chen' },
  { username: 'superfan3', email: 'superfan3@test.com', firstName: 'Morgan', lastName: 'Kim' },
  { username: 'superfan4', email: 'superfan4@test.com', firstName: 'Taylor', lastName: 'Patel' },
  { username: 'superfan5', email: 'superfan5@test.com', firstName: 'Casey', lastName: 'Okafor' },
  { username: 'superfan6', email: 'superfan6@test.com', firstName: 'Riley', lastName: 'Santos' },
  { username: 'superfan7', email: 'superfan7@test.com', firstName: 'Drew', lastName: 'Nguyen' },
  { username: 'superfan8', email: 'superfan8@test.com', firstName: 'Jamie', lastName: 'Muller' },
] as const;

export class TrackPlaysSeeder implements Seeder {
  public async run(dataSource: DataSource, _factoryManager: SeederFactoryManager): Promise<void> {
    const trackPlayRepository = dataSource.getRepository(TrackPlay);
    const recentlyPlayedRepository = dataSource.getRepository(RecentlyPlayed);
    const firstFanRepository = dataSource.getRepository(TrackFirstFan);
    const trackRepository = dataSource.getRepository(Track);
    const userRepository = dataSource.getRepository(User);
    const userEmailRepository = dataSource.getRepository(UserEmail);
    const playlistRepository = dataSource.getRepository(Playlist);
    const likesRepository = dataSource.getRepository(TrackLikes);
    const followsRepository = dataSource.getRepository(UserFollow);
    const settingsRepository = dataSource.getRepository(Settings);

    const existingPlays = await trackPlayRepository.count();
    if (existingPlays > 0) {
      console.log('Track plays already seeded. Skipping...');
      return;
    }

    // ── 1. Create fan demo users ──────────────────────────────────────────────
    console.log('  Creating fan demo users...');
    const passwordHash = await bcrypt.hash('Password123', 10);
    const fanUsers: User[] = [];

    for (const fd of FAN_DEMOS) {
      let fan = await userRepository.findOne({ where: { username: fd.username } });
      if (!fan) {
        fan = await userRepository.save(
          userRepository.create({
            username: fd.username,
            passwordHash,
            firstName: fd.firstName,
            lastName: fd.lastName,
            displayName: `${fd.firstName} ${fd.lastName}`,
            role: 'listener',
            plan: 'free',
            isPublic: true,
            avatarUrl: AVATAR_URL,
            bio: 'Dedicated music fan.',
          })
        );
        await addDocuments([mapUser(fan)]);
        await userEmailRepository.save(
          userEmailRepository.create({
            userId: fan.userId,
            email: fd.email,
            isPrimary: true,
            isVerified: true,
            verifiedAt: new Date(),
          })
        );
        // Explicit settings to guarantee show_when_top_or_first_fan = true
        await settingsRepository.save(settingsRepository.create({ userId: fan.userId }));
      }
      fanUsers.push(fan);
    }
    console.log(`  Created ${fanUsers.length} fan demo users (superfan1-8 / Password123)`);

    // ── 2. Resolve artists and their first 3 public tracks each ───────────────
    const artist1 = await userRepository.findOne({ where: { username: 'artist1' } });
    const artist2 = await userRepository.findOne({ where: { username: 'artist2' } });

    if (!artist1 || !artist2) {
      console.warn('  artist1 or artist2 not found. Run UserSeeder first.');
      return;
    }

    const [a1Tracks, a2Tracks] = await Promise.all([
      trackRepository.find({
        where: { userId: artist1.userId, visibility: TrackVisibility.PUBLIC, hidden: false },
        take: 3,
      }),
      trackRepository.find({
        where: { userId: artist2.userId, visibility: TrackVisibility.PUBLIC, hidden: false },
        take: 3,
      }),
    ]);

    // featuredTracks spans both artists so fans' play histories cross artists,
    // enabling related-track discovery (fans of A's tracks also played B's tracks)
    const featuredTracks = [...a1Tracks, ...a2Tracks];

    if (featuredTracks.length === 0) {
      console.warn('  No public tracks found. Run TrackSeeder first.');
      return;
    }

    // ── 3. Fans follow both artists ───────────────────────────────────────────
    for (const fan of fanUsers) {
      for (const artist of [artist1, artist2]) {
        const exists = await followsRepository.findOne({
          where: { follower: fan.userId, followed: artist.userId },
        });
        if (!exists) {
          await followsRepository.save(
            followsRepository.create({ follower: fan.userId, followed: artist.userId })
          );
        }
      }
    }

    // ── 4. Fans like all featured tracks ──────────────────────────────────────
    for (const fan of fanUsers) {
      for (const track of featuredTracks) {
        const exists = await likesRepository.findOne({
          where: { userId: fan.userId, trackId: track.trackId },
        });
        if (!exists) {
          await likesRepository.save(
            likesRepository.create({ userId: fan.userId, trackId: track.trackId })
          );
        }
      }
    }

    // ── 5. Build play records ─────────────────────────────────────────────────
    // Each fan gets:
    //  • 10 plays within the first-7-day window  → qualifies as a first fan
    //  • 10 plays after the window               → boosts top-fan ranking
    // All fans play ALL featured tracks from both artists
    //  → top fans of track A also played track B → related-track data
    const allPlays: Partial<TrackPlay>[] = [];
    const artistLatestPlay = new Map<string, Map<string, Date>>();

    for (const track of featuredTracks) {
      const releaseDate = track.releaseDate
        ? new Date(track.releaseDate)
        : new Date(track.createdAt);
      const windowEnd = new Date(releaseDate.getTime() + 7 * DAY_MS);

      for (const fan of fanUsers) {
        // 10 plays spread evenly across the first 6 days
        for (let i = 0; i < 10; i++) {
          allPlays.push({
            trackId: track.trackId,
            userId: fan.userId,
            playedAt: new Date(releaseDate.getTime() + (i / 10) * 6 * DAY_MS),
            playlistId: null,
          });
        }
        // 10 plays after the window, one every 2 days
        for (let i = 0; i < 10; i++) {
          const playedAt = new Date(windowEnd.getTime() + (i + 1) * 2 * DAY_MS);
          allPlays.push({ trackId: track.trackId, userId: fan.userId, playedAt, playlistId: null });

          // Track latest play per (fan → artist) for recently_played
          const artistId = track.userId;
          if (!artistLatestPlay.has(fan.userId)) artistLatestPlay.set(fan.userId, new Map());
          const aMap = artistLatestPlay.get(fan.userId)!;
          if (!aMap.has(artistId) || playedAt > aMap.get(artistId)!) {
            aMap.set(artistId, playedAt);
          }
        }
      }
    }

    // ── 6. Legacy listener plays (listener1–3) kept for other seed expectations ─
    const listeners = await userRepository.find({
      where: [{ username: 'listener1' }, { username: 'listener2' }, { username: 'listener3' }],
    });

    const legacyTracks: Track[] = [];
    for (const artist of [artist1, artist2]) {
      const artistTracks = await trackRepository.find({
        where: { userId: artist.userId },
        take: 3,
      });
      legacyTracks.push(...artistTracks);
    }

    const playlistLatestPlay = new Map<string, Map<string, Date>>();
    const playlists = await playlistRepository.find({ take: 3 });

    for (const track of legacyTracks) {
      const releaseDate = track.releaseDate
        ? new Date(track.releaseDate)
        : new Date(track.createdAt);
      const windowEnd = new Date(releaseDate.getTime() + 7 * DAY_MS);

      for (const listener of listeners) {
        const playTimes: Date[] = [
          new Date(releaseDate.getTime() + Math.random() * 6 * DAY_MS),
          new Date(windowEnd.getTime() + Math.random() * 10 * DAY_MS),
          new Date(windowEnd.getTime() + Math.random() * 20 * DAY_MS),
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

          // Track latest (listener → artist) for recently_played
          const artistId = track.userId;
          if (!artistLatestPlay.has(listener.userId))
            artistLatestPlay.set(listener.userId, new Map());
          const aMap = artistLatestPlay.get(listener.userId)!;
          if (!aMap.has(artistId) || playedAt > aMap.get(artistId)!) {
            aMap.set(artistId, playedAt);
          }

          // Track latest (listener → playlist) for recently_played
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

    // ── 7. Persist all plays ──────────────────────────────────────────────────
    await trackPlayRepository.save(allPlays as TrackPlay[]);
    console.log(`  - ${allPlays.length} play records created`);

    // ── 8. Upsert recently_played ─────────────────────────────────────────────
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

    // ── 9. Snapshot first fans for featured tracks ────────────────────────────
    console.log('  Computing first fan snapshots...');
    const allLikes = await likesRepository.find();
    const allFollows = await followsRepository.find();
    const likeSet = new Set(allLikes.map((l) => `${l.userId}:${l.trackId}`));
    const followSet = new Set(allFollows.map((f) => `${f.follower}:${f.followed}`));

    const firstFanEntries: Partial<TrackFirstFan>[] = [];

    for (const track of featuredTracks) {
      const releaseDate = track.releaseDate
        ? new Date(track.releaseDate)
        : new Date(track.createdAt);
      const windowEnd = new Date(releaseDate.getTime() + 7 * DAY_MS);

      const earlyPlays = allPlays.filter(
        (p) => p.trackId === track.trackId && p.playedAt! <= windowEnd
      );
      const earlyPlayerIds = [...new Set(earlyPlays.map((p) => p.userId!))];

      // Qualification: follows artist + liked track + has avatarUrl
      // (show_when_top_or_first_fan defaults true for all fan users we created)
      const qualifiedIds = earlyPlayerIds.filter((userId) => {
        const user = [...fanUsers, ...listeners].find((u) => u.userId === userId);
        return (
          user?.avatarUrl &&
          followSet.has(`${userId}:${track.userId}`) &&
          likeSet.has(`${userId}:${track.trackId}`)
        );
      });

      if (qualifiedIds.length === 0) continue;

      // All-time play count for ranking
      const playCountMap = new Map<string, number>();
      for (const play of allPlays.filter((p) => p.trackId === track.trackId)) {
        if (qualifiedIds.includes(play.userId!)) {
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
      console.log('  - No first fans qualified (check follows, likes, avatarUrl conditions)');
    }

    console.log('Track plays seeding complete!');
    console.log(`   - ${fanUsers.length} fan users (superfan1-8 / Password123)`);
    console.log(
      `   - Each fan follows both artists, liked all ${featuredTracks.length} featured tracks`
    );
    console.log(`   - ${allPlays.length} total plays`);
  }
}
