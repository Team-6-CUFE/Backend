import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { User } from '../../user/entities/user.entity';
import { Playlist } from '../../playlist/entities/playlist.entity';
import { PlaylistLike } from '../../playlist/entities/playlist-likes.entity';
import { PlaylistRepost } from '../../playlist/entities/playlist-reposts.entity';

export class PlaylistSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<void> {
    const userRepository = dataSource.getRepository(User);
    const playlistRepository = dataSource.getRepository(Playlist);
    const playlistLikeRepository = dataSource.getRepository(PlaylistLike);
    const playlistRepostRepository = dataSource.getRepository(PlaylistRepost);

    // Check if playlists already exist
    const existingPlaylists = await playlistRepository.count();
    if (existingPlaylists > 0) {
      console.log('Playlists already seeded. Skipping...');
      return;
    }

    // We MUST have users to create playlists (Foreign Key constraint)
    const users = await userRepository.find();
    if (users.length === 0) {
      console.log('No users found in the database. Please run UserSeeder first.');
      return;
    }

    console.log('Seeding playlists...');

    // Get factories
    const playlistFactory = factoryManager.get(Playlist);

    const allCreatedPlaylists: Playlist[] = [];

    // 1. Create specific playlists for known users (e.g., your "artists")
    console.log('  Creating specific test playlists...');

    // Find our specific artists from the UserSeeder
    const artist1 = users.find((u) => u.username === 'artist1');
    const artist2 = users.find((u) => u.username === 'artist2');

    if (artist1) {
      const playlist1 = playlistRepository.create({
        title: 'Late Night Lo-Fi Beats',
        description: 'Chill beats to study and relax to.',
        isPublic: true,
        userId: artist1.userId,
      });
      allCreatedPlaylists.push(await playlistRepository.save(playlist1));

      const playlist2 = playlistRepository.create({
        title: 'Unreleased Demos (Private)',
        description: 'WIP tracks.',
        isPublic: false, // Private playlist
        userId: artist1.userId,
      });
      allCreatedPlaylists.push(await playlistRepository.save(playlist2));
    }

    if (artist2) {
      const playlist3 = playlistRepository.create({
        title: 'Summer Festival Mix',
        description: 'High energy EDM and House.',
        isPublic: true,
        userId: artist2.userId,
      });
      allCreatedPlaylists.push(await playlistRepository.save(playlist3));
    }

    // 2. Generate 30 random playlists using the factory
    // 2. Generate 30 random playlists using the factory
    console.log('  Generating 30 random playlists...');

    for (let i = 0; i < 30; i++) {
      // Create the fake playlist object in memory
      const randomPlaylist = await playlistFactory.make();

      // Pick a random user to own this playlist
      const randomOwner = users[Math.floor(Math.random() * users.length)];

      // THE FIX: Use repository.create() to properly bind the relationship
      // This forces TypeORM to recognize both the raw ID and the relation object
      const playlistToSave = playlistRepository.create({
        ...randomPlaylist,
        userId: randomOwner.userId,
        user: randomOwner,
      });

      // Save the complete playlist to the database
      const savedPlaylist = await playlistRepository.save(playlistToSave);
      allCreatedPlaylists.push(savedPlaylist);
    }

    // 3. Generate Likes and Reposts for all playlists
    console.log('  Generating random likes and reposts (testing triggers)...');

    for (const playlist of allCreatedPlaylists) {
      // Shuffle users to ensure unique likers/reposters (prevents composite primary key errors)
      const shuffledUsersForLikes = [...users].sort(() => 0.5 - Math.random());
      const shuffledUsersForReposts = [...users].sort(() => 0.5 - Math.random());

      // Generate 0 to 15 likes per playlist
      const numLikes = Math.floor(Math.random() * 16);
      const likers = shuffledUsersForLikes.slice(0, numLikes);

      for (const liker of likers) {
        await playlistLikeRepository.save({
          playlistId: playlist.playlistId,
          userId: liker.userId,
        });
      }

      // Generate 0 to 5 reposts per playlist
      const numReposts = Math.floor(Math.random() * 6);
      const reposters = shuffledUsersForReposts.slice(0, numReposts);

      for (const reposter of reposters) {
        await playlistRepostRepository.save({
          playlistId: playlist.playlistId,
          userId: reposter.userId,
        });
      }
    }

    console.log('Playlists seeded successfully!');
    console.log(`   - Created ${allCreatedPlaylists.length} total playlists`);
    console.log(
      `   - Random likes and reposts generated (Database triggers should have updated the counts!)`
    );
  }
}
