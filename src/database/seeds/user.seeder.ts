import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { User } from '../../user/entities/user.entity';
import { UserEmail } from '../../user/entities/user-email.entity';
import { ExternalProfile } from '../../user/entities/external-profile.entity';
import { SocialAccount } from '../../user/entities/social-account.entity';
import { FavoriteGenre } from '../../user/entities/favorite-genre.entity';
import { Genre } from '../../genre/entities/genre.entity';
import * as bcrypt from 'bcrypt';

export class UserSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<void> {
    const userRepository = dataSource.getRepository(User);
    const emailRepository = dataSource.getRepository(UserEmail);
    const externalProfileRepository = dataSource.getRepository(ExternalProfile);
    const socialAccountRepository = dataSource.getRepository(SocialAccount);
    const favoriteGenreRepository = dataSource.getRepository(FavoriteGenre);
    const genreRepository = dataSource.getRepository(Genre);

    // Check if users already exist
    const existingUsers = await userRepository.count();
    if (existingUsers > 0) {
      console.log('Users already seeded. Skipping...');
      return;
    }

    console.log('Seeding users...');

    // Get factories
    const userFactory = factoryManager.get(User);
    const emailFactory = factoryManager.get(UserEmail);
    const externalProfileFactory = factoryManager.get(ExternalProfile);
    const socialAccountFactory = factoryManager.get(SocialAccount);

    // Get all genres for random assignment
    const genres = await genreRepository.find();

    // Create 1 admin user (manually)
    console.log('  Creating admin user...');
    const admin = userRepository.create({
      username: 'admin',
      password_hash: await bcrypt.hash('admin123', 10),
      first_name: 'Admin',
      last_name: 'User',
      display_name: 'Administrator',
      role: 'admin',
      plan: 'premium',
      is_public: true,
    });
    await userRepository.save(admin);

    const adminEmail = emailRepository.create({
      user_id: admin.user_id,
      email: 'admin@soundcloud.com',
      is_primary: true,
      is_verified: true,
      verified_at: new Date(),
    });
    await emailRepository.save(adminEmail);

    // Create 3 known test users (for development)
    console.log('  Creating test users...');
    const testUsers = [
      {
        username: 'artist1',
        email: 'artist1@test.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'artist',
        plan: 'pro',
      },
      {
        username: 'artist2',
        email: 'artist2@test.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'artist',
        plan: 'premium',
      },
      {
        username: 'listener1',
        email: 'listener1@test.com',
        first_name: 'Mike',
        last_name: 'Johnson',
        role: 'listener',
        plan: 'free',
      },
    ];

    for (const testUserData of testUsers) {
      const user = userRepository.create({
        username: testUserData.username,
        password_hash: await bcrypt.hash('password123', 10),
        first_name: testUserData.first_name,
        last_name: testUserData.last_name,
        display_name: `${testUserData.first_name} ${testUserData.last_name}`,
        role: testUserData.role,
        plan: testUserData.plan,
        bio: `Test ${testUserData.role} account`,
        is_public: true,
      });
      await userRepository.save(user);

      // Create primary email
      const email = emailRepository.create({
        user_id: user.user_id,
        email: testUserData.email,
        is_primary: true,
        is_verified: true,
        verified_at: new Date(),
      });
      await emailRepository.save(email);

      // Add 2-4 favorite genres
      const randomGenres = genres
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.floor(Math.random() * 3) + 2);

      for (const genre of randomGenres) {
        await favoriteGenreRepository.save({
          user_id: user.user_id,
          genre_id: genre.genre_id,
        });
      }
    }

    // Generate 50 random users using factory
    console.log('  Generating 50 random users...');
    const randomUsers = await userFactory.saveMany(50);

    // For each random user, create associated data
    for (const user of randomUsers) {
      // Create primary email
      const primaryEmail = await emailFactory.make({
        user_id: user.user_id,
        is_primary: true,
        is_verified: true,
        verified_at: new Date(),
      });
      await emailRepository.save(primaryEmail);

      // 30% chance of having a secondary email
      if (Math.random() < 0.3) {
        const secondaryEmail = await emailFactory.make({
          user_id: user.user_id,
          is_primary: false,
          is_verified: Math.random() < 0.5,
        });
        await emailRepository.save(secondaryEmail);
      }

      // 40% chance of having external profiles
      if (Math.random() < 0.4) {
        const platforms = [
          'instagram',
          'twitter',
          'facebook',
          'youtube',
          'tiktok',
          'spotify',
          'soundcloud',
          'bandcamp',
          'linkedin',
        ];

        const profileCount = Math.floor(Math.random() * 3) + 1;

        const selectedPlatforms = platforms.sort(() => 0.5 - Math.random()).slice(0, profileCount);

        for (const platformName of selectedPlatforms) {
          const profile = await externalProfileFactory.make({
            user_id: user.user_id,
            name: platformName,
          });
          await externalProfileRepository.save(profile);
        }
      }

      // 20% chance of having a social account
      if (Math.random() < 0.2) {
        const account = await socialAccountFactory.make({
          user_id: user.user_id,
        });
        await socialAccountRepository.save(account);
      }

      // Add 1-5 favorite genres
      const randomGenres = genres
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.floor(Math.random() * 5) + 1);

      for (const genre of randomGenres) {
        await favoriteGenreRepository.save({
          user_id: user.user_id,
          genre_id: genre.genre_id,
        });
      }
    }

    console.log('Users seeded successfully!');
    console.log(`   - 1 admin user (admin / admin123)`);
    console.log(`   - 3 test users (artist1, artist2, listener1 / password123)`);
    console.log(`   - 50 random users (all password: password123)`);
  }
}
