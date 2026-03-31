import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { User } from '../../user/entities/user.entity';
import { Track } from '../../track/entities/track.entity';
import { Playlist } from '../../playlist/entities/playlist.entity';
import { PlaylistLike } from '../../playlist/entities/playlist-likes.entity';
import { PlaylistRepost } from '../../playlist/entities/playlist-reposts.entity';
import { PlaylistTrack } from '../../playlist/entities/playlist-tracks.entity'; // Added PlaylistTrack

export class PlaylistSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<void> {
    const userRepository = dataSource.getRepository(User);
    const trackRepository = dataSource.getRepository(Track); // Initialize Track Repo
    const playlistRepository = dataSource.getRepository(Playlist);
    const playlistLikeRepository = dataSource.getRepository(PlaylistLike);
    const playlistRepostRepository = dataSource.getRepository(PlaylistRepost);
    const playlistTrackRepository = dataSource.getRepository(PlaylistTrack); // Initialize Junction Repo

    // Check if playlists already exist
    const existingPlaylists = await playlistRepository.count();
    if (existingPlaylists > 0) {
      console.log('Playlists already seeded. Skipping...');
      return;
    }

    const users = await userRepository.find();
    const tracks = await trackRepository.find(); // Fetch all available tracks

    if (users.length === 0 || tracks.length === 0) {
      console.log('Missing Users or Tracks. Please seed them first.');
      return;
    }

    console.log('Seeding playlists and adding tracks...');

    const playlistFactory = factoryManager.get(Playlist);
    const allCreatedPlaylists: Playlist[] = [];

    // 1. Create specific playlists for artists
    const artist1 = users.find((u) => u.username === 'artist1');
    const artist2 = users.find((u) => u.username === 'artist2');

    if (artist1) {
      const p1 = await playlistRepository.save(
        playlistRepository.create({
          title: 'Late Night Lo-Fi Beats',
          description: 'Chill beats to study and relax to.',
          isPublic: true,
          userId: artist1.userId,
        })
      );
      allCreatedPlaylists.push(p1);

      const p2 = await playlistRepository.save(
        playlistRepository.create({
          title: 'Unreleased Demos (Private)',
          description: 'WIP tracks.',
          isPublic: false,
          userId: artist1.userId,
        })
      );
      allCreatedPlaylists.push(p2);
    }

    if (artist2) {
      const p3 = await playlistRepository.save(
        playlistRepository.create({
          title: 'Summer Festival Mix',
          description: 'High energy EDM and House.',
          isPublic: true,
          userId: artist2.userId,
        })
      );
      allCreatedPlaylists.push(p3);
    }

    // 2. Generate 30 random playlists using factory
    for (let i = 0; i < 30; i++) {
      const randomPlaylist = await playlistFactory.make();
      const randomOwner = users[Math.floor(Math.random() * users.length)];

      const savedPlaylist = await playlistRepository.save(
        playlistRepository.create({
          ...randomPlaylist,
          userId: randomOwner.userId,
          user: randomOwner,
        })
      );
      allCreatedPlaylists.push(savedPlaylist);
    }

    // 3. Populate tracks, likes, and reposts
    console.log('  Populating tracks, likes, and reposts (testing all triggers)...');

    for (const playlist of allCreatedPlaylists) {
      // --- ADD TRACKS TO PLAYLIST ---
      // Pick 5 to 12 random tracks
      const numTracks = Math.floor(Math.random() * 8) + 5;
      const selectedTracks = [...tracks].sort(() => 0.5 - Math.random()).slice(0, numTracks);

      for (let i = 0; i < selectedTracks.length; i++) {
        await playlistTrackRepository.save({
          playlistId: playlist.playlistId,
          trackId: selectedTracks[i].trackId,
          position: i + 1, // Sequential position 1, 2, 3...
        });
      }

      // --- GENERATE LIKES ---
      const shuffledUsersForLikes = [...users].sort(() => 0.5 - Math.random());
      const numLikes = Math.floor(Math.random() * 16);
      const likers = shuffledUsersForLikes.slice(0, numLikes);

      for (const liker of likers) {
        await playlistLikeRepository.save({
          playlistId: playlist.playlistId,
          userId: liker.userId,
        });
      }

      // --- GENERATE REPOSTS ---
      const shuffledUsersForReposts = [...users].sort(() => 0.5 - Math.random());
      const numReposts = Math.floor(Math.random() * 6);
      const reposters = shuffledUsersForReposts.slice(0, numReposts);

      for (const reposter of reposters) {
        await playlistRepostRepository.save({
          playlistId: playlist.playlistId,
          userId: reposter.userId,
        });
      }
    }

    console.log('Seeding complete!');
    console.log(` - ${allCreatedPlaylists.length} Playlists created.`);
    console.log(` - Tracks added (Triggers should update tracks_count).`);
    console.log(
      ` - Likes & Reposts generated (Triggers should update likes_count & reposts_count).`
    );
  }
}
