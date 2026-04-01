import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { User } from '../../user/entities/user.entity';
import { Track } from '../../track/entities/track.entity';
import { TrackLikes } from '../../track/entities/track-likes.entity';
import { TrackRepost } from '../../track/entities/track-reposts.entity';
import { TrackComment } from '../../track/entities/track-comments.entity';

export class TrackSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<void> {
    const trackRepository = dataSource.getRepository(Track);
    const userRepository = dataSource.getRepository(User);
    const likesRepository = dataSource.getRepository(TrackLikes);
    const repostRepository = dataSource.getRepository(TrackRepost);
    const commentRepository = dataSource.getRepository(TrackComment);

    // 1. Check if tracks already exist
    const existingTracks = await trackRepository.count();
    if (existingTracks > 0) {
      console.log('Tracks already seeded. Skipping...');
      return;
    }

    // 2. Get all artists (Users with role 'artist' or 'admin')
    const artists = await userRepository.find({
      where: [{ role: 'artist' }, { role: 'admin' }],
    });

    if (artists.length === 0) {
      console.warn('No artists found. Please run UserSeeder first.');
      return;
    }

    // 3. Get all users (for engagement seeding)
    const allUsers = await userRepository.find();

    console.log('Seeding tracks and engagements...');

    // 4. Get factories
    const trackFactory = factoryManager.get(Track);
    const likeFactory = factoryManager.get(TrackLikes);
    const repostFactory = factoryManager.get(TrackRepost);
    const commentFactory = factoryManager.get(TrackComment);

    let totalTracksCreated = 0;
    let totalCommentsCreated = 0;

    // 5. Generate tracks for each artist
    for (const artist of artists) {
      // Each artist gets between 2 and 8 tracks
      const trackCount = Math.floor(Math.random() * 7) + 2;

      console.log(`  Generating ${trackCount} tracks for artist: ${artist.username}`);

      const tracks = await trackFactory.saveMany(trackCount, {
        userId: artist.userId,
        user: artist,
      });

      totalTracksCreated += tracks.length;

      // 6. Generate Engagement for each track
      for (const track of tracks) {
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
        }

        // Seed replies: 40% chance each top-level comment gets 1–3 replies
        for (const parent of topLevelComments) {
          if (Math.random() < 0.4) {
            const replyCount = Math.floor(Math.random() * 3) + 1;
            for (let r = 0; r < replyCount; r++) {
              const randomUser = allUsers[Math.floor(Math.random() * allUsers.length)];
              const reply = await commentFactory.make({
                userId: randomUser.userId,
                trackId: track.trackId,
                timestampSeconds: parent.timestampSeconds,
                parentId: parent.commentId,
              });
              await commentRepository.save(reply);
              totalCommentsCreated++;
            }
          }
        }
      }
    }
    console.log('Tracks seeded successfully!');
    console.log(`   - Created ${totalTracksCreated} total tracks across ${artists.length} artists`);
    console.log(`   - Created ${totalCommentsCreated} total comments`);
    console.log(
      `   - Random likes and reposts generated (Database triggers should have updated the counts!)`
    );
  }
}
