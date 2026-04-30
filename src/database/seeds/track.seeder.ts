import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { User } from '../../user/entities/user.entity';
import { Track } from '../../track/entities/track.entity';
import { TrackLikes } from '../../track/entities/track-likes.entity';
import { TrackRepost } from '../../track/entities/track-reposts.entity';
import { TrackComment } from '../../track/entities/track-comments.entity';
import { Activity, ActivityType } from '../../activity/entities/activity.entity';
import { getIndex } from '../../search/client';
import { TrackVisibility } from '../../track/enums/track-visibility.enum';
import { Genre } from '../../genre/entities/genre.entity';

export class TrackSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<void> {
    const trackRepository = dataSource.getRepository(Track);
    const userRepository = dataSource.getRepository(User);
    const likesRepository = dataSource.getRepository(TrackLikes);
    const repostRepository = dataSource.getRepository(TrackRepost);
    const commentRepository = dataSource.getRepository(TrackComment);
    const activityRepository = dataSource.getRepository(Activity);
    const genreRepository = dataSource.getRepository(Genre);

    const genres = await genreRepository.find();

    // 1. Check if tracks already exist
    const existingTracks = await trackRepository.count();
    if (existingTracks > 0) {
      console.log('Tracks already seeded. Skipping...');
      return;
    }

    // 2. Get all artists (Users with role 'artist' or 'admin')
    var artists = await userRepository.find({
      where: [{ role: 'artist' }, { role: 'admin' }],
    });

    if (artists.length === 0) {
      console.warn('No artists found. Please run UserSeeder first.');
      return;
    }

    // 3. Get all users (for engagement seeding)
    const allUsers = await userRepository.find();

    // add some listeners to the artists array to seed some tracks for them as well
    artists = artists.concat(
      allUsers.filter((u) => u.role === 'listener').slice(0, Math.floor(allUsers.length * 0.1))
    );

    console.log('Seeding tracks and engagements...');

    // 4. Get factories
    const trackFactory = factoryManager.get(Track);
    const likeFactory = factoryManager.get(TrackLikes);
    const repostFactory = factoryManager.get(TrackRepost);
    const commentFactory = factoryManager.get(TrackComment);

    let totalTracksCreated = 0;
    let totalCommentsCreated = 0;
    let totalActivitiesCreated = 0;
    const index = getIndex();

    // 5. Generate tracks for each artist
    for (const artist of artists) {
      // Each artist gets between 2 and 8 tracks
      const trackCount = Math.floor(Math.random() * 7) + 2;

      console.log(`  Generating ${trackCount} tracks for artist: ${artist.username}`);

      const tracks = await trackFactory.saveMany(trackCount, {
        userId: artist.userId,
        user: artist,
        genre: genres[Math.floor(Math.random() * genres.length)],
      });

      await index.addDocuments(
        tracks
          .filter((t) => !t.hidden && t.visibility === TrackVisibility.PUBLIC)
          .map((t) => ({
            id: `track_${t.trackId}`,
            type: 'track',
            title: t.title,
            artist_name: artist.displayName,
            description: t.description,
            tags: t.tags?.map((t) => t.name),
            genre: t.genre?.name,
            duration: t.durationSeconds,
            created_at: t.createdAt,
          }))
      );

      totalTracksCreated += tracks.length;

      // --- Seed track_posted activity for each track ---
      for (const track of tracks) {
        await activityRepository.save(
          activityRepository.create({
            activityType: ActivityType.TRACK_POSTED,
            targetId: track.trackId,
            userId: artist.userId,
            targetUserId: null,
          })
        );
        totalActivitiesCreated++;
      }

      // 6. Generate Engagement for each track (public, non-hidden only)
      for (const track of tracks) {
        if (track.visibility !== TrackVisibility.PUBLIC || track.hidden) continue;

        // --- A. Seed Likes ---
        // 20% to 60% of users like each track
        const likers = [...allUsers]
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.floor(allUsers.length * (Math.random() * 0.4 + 0.2)));

        for (const liker of likers) {
          const like = await likeFactory.make({
            userId: liker.userId,
            trackId: track.trackId,
          });
          await likesRepository.save(like);

          // --- Seed track_like activity ---
          await activityRepository.save(
            activityRepository.create({
              activityType: ActivityType.TRACK_LIKE,
              targetId: track.trackId,
              userId: liker.userId,
              targetUserId: artist.userId,
            })
          );
          totalActivitiesCreated++;
        }

        // --- B. Seed Reposts ---
        // 5% to 15% of users repost each track
        const reposters = [...allUsers]
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.floor(allUsers.length * (Math.random() * 0.1 + 0.05)));

        for (const reposter of reposters) {
          const repost = await repostFactory.make({
            userId: reposter.userId,
            trackId: track.trackId,
          });
          await repostRepository.save(repost);

          // --- Seed track_repost activity ---
          await activityRepository.save(
            activityRepository.create({
              activityType: ActivityType.TRACK_REPOST,
              targetId: track.trackId,
              userId: reposter.userId,
              targetUserId: artist.userId,
            })
          );
          totalActivitiesCreated++;
        }

        // --- C. Seed Comments ---
        const commentCount = Math.floor(Math.random() * 9) + 2;
        const topLevelComments: TrackComment[] = [];
        for (let i = 0; i < commentCount; i++) {
          const randomUser = allUsers[Math.floor(Math.random() * allUsers.length)];
          const comment = await commentFactory.make({
            userId: randomUser.userId,
            trackId: track.trackId,
            timestampSeconds: Math.floor(Math.random() * (track.durationSeconds || 300)),
            parentId: null,
          });
          const saved = await commentRepository.save(comment);
          topLevelComments.push(saved);
          totalCommentsCreated++;

          // --- Seed track_comment activity for top-level comment ---
          await activityRepository.save(
            activityRepository.create({
              activityType: ActivityType.TRACK_COMMENT,
              targetId: track.trackId,
              userId: randomUser.userId,
              targetUserId: artist.userId,
            })
          );
          totalActivitiesCreated++;
        }

        // Seed replies: 40% chance each top-level comment gets 1 reply
        for (const parent of topLevelComments) {
          if (Math.random() < 0.4) {
            const randomUser = allUsers[Math.floor(Math.random() * allUsers.length)];
            const reply = await commentFactory.make({
              userId: randomUser.userId,
              trackId: track.trackId,
              timestampSeconds: parent.timestampSeconds,
              parentId: parent.commentId,
            });
            await commentRepository.save(reply);
            totalCommentsCreated++;

            // --- Seed track_comment activity for reply ---
            await activityRepository.save(
              activityRepository.create({
                activityType: ActivityType.TRACK_COMMENT,
                targetId: track.trackId,
                userId: randomUser.userId,
                targetUserId: artist.userId,
              })
            );
            totalActivitiesCreated++;
          }
        }
      }
    }
    console.log('Tracks seeded successfully!');
    console.log(`   - Created ${totalTracksCreated} total tracks across ${artists.length} artists`);
    console.log(`   - Created ${totalCommentsCreated} total comments`);
    console.log(`   - Created ${totalActivitiesCreated} total activities`);
    console.log(
      `   - Random likes and reposts generated (Database triggers should have updated the counts!)`
    );
  }
}
