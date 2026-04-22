import { DataSource, Repository } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { User } from '../../user/entities/user.entity';
import { UserEmail } from '../../user/entities/user-email.entity';
import { ExternalProfile } from '../../user/entities/external-profile.entity';
import { SocialAccount } from '../../user/entities/social-account.entity';
import { FavoriteGenre } from '../../user/entities/favorite-genre.entity';
import { Genre } from '../../genre/entities/genre.entity';
import { Settings } from '../../settings/entities/settings.entity';
import * as bcrypt from 'bcrypt';
import { mapUser, addDocuments } from '../../search/indexing';

export class UserSeeder implements Seeder {
  private async createSettingsForUser(
    userId: string,
    settingsRepository: Repository<Settings>
  ): Promise<void> {
    const settings = settingsRepository.create({
      userId,
    });
    await settingsRepository.save(settings);
  }
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<void> {
    const userRepository = dataSource.getRepository(User);
    const emailRepository = dataSource.getRepository(UserEmail);
    const externalProfileRepository = dataSource.getRepository(ExternalProfile);
    const socialAccountRepository = dataSource.getRepository(SocialAccount);
    const favoriteGenreRepository = dataSource.getRepository(FavoriteGenre);
    const genreRepository = dataSource.getRepository(Genre);
    const settingsRepository = dataSource.getRepository(Settings);

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
      passwordHash: await bcrypt.hash('Admin123', 10),
      firstName: 'Admin',
      lastName: 'User',
      displayName: 'Administrator',
      role: 'admin',
      plan: 'go+',
      isPublic: true,
    });
    var adminUser = await userRepository.save(admin);
    await addDocuments([mapUser(adminUser)]);
    await this.createSettingsForUser(admin.userId, settingsRepository);

    const adminEmail = emailRepository.create({
      userId: admin.userId,
      email: 'admin@soundcloud.com',
      isPrimary: true,
      isVerified: true,
      verifiedAt: new Date(),
    });
    await emailRepository.save(adminEmail);

    // Create known test users (for development)
    console.log('  Creating test users...');
    const testUsers = [
      {
        username: 'artist1',
        email: 'artist1@test.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'artist',
        plan: 'pro',
      },
      {
        username: 'artist2',
        email: 'artist2@test.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'artist',
        plan: 'go+',
      },
      {
        username: 'listener1',
        email: 'listener1@test.com',
        firstName: 'Mike',
        lastName: 'Johnson',
        role: 'listener',
        plan: 'free',
      },
      {
        username: 'listener2',
        email: 'listener2@test.com',
        firstName: 'Emily',
        lastName: 'Johnson',
        role: 'listener',
        plan: 'free',
        isSuspended: true,
      },
      {
        username: 'listener3',
        email: 'listener3@test.com',
        firstName: 'Ann',
        lastName: 'Michael',
        role: 'listener',
        plan: 'free',
      },
    ];

    for (const testUserData of testUsers) {
      const user = userRepository.create({
        username: testUserData.username,
        passwordHash: await bcrypt.hash('Password123', 10),
        firstName: testUserData.firstName,
        lastName: testUserData.lastName,
        displayName: `${testUserData.firstName} ${testUserData.lastName}`,
        role: testUserData.role,
        plan: testUserData.plan,
        bio: `Test ${testUserData.role} account`,
        isPublic: true,
        isSuspended: testUserData.isSuspended || false,
      });
      const savedUser = await userRepository.save(user);
      await addDocuments([mapUser(savedUser)]);
      await this.createSettingsForUser(user.userId, settingsRepository);

      // Create primary email
      const email = emailRepository.create({
        userId: user.userId,
        email: testUserData.email,
        isPrimary: true,
        isVerified: testUserData.firstName !== 'Ann',
        verifiedAt: new Date(),
      });
      await emailRepository.save(email);

      // Add 2-4 favorite genres
      const randomGenres = genres
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.floor(Math.random() * 3) + 2);

      for (const genre of randomGenres) {
        await favoriteGenreRepository.save({
          userId: user.userId,
          genreId: genre.genreId,
        });
      }
    }

    // Generate 50 random users using factory
    console.log('  Generating 50 random users...');
    const randomUsers = await userFactory.saveMany(50);

    // For each random user, create associated data
    for (const user of randomUsers) {
      await this.createSettingsForUser(user.userId, settingsRepository);
      // Create primary email
      const primaryEmail = await emailFactory.make({
        userId: user.userId,
        isPrimary: true,
        isVerified: true,
        verifiedAt: new Date(),
      });
      await emailRepository.save(primaryEmail);

      // 30% chance of having a secondary email
      if (Math.random() < 0.3) {
        const secondaryEmail = await emailFactory.make({
          userId: user.userId,
          isPrimary: false,
          isVerified: Math.random() < 0.5,
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
            userId: user.userId,
            name: platformName,
          });
          await externalProfileRepository.save(profile);
        }
      }

      // 20% chance of having a social account
      if (Math.random() < 0.2) {
        const account = await socialAccountFactory.make({
          userId: user.userId,
        });
        await socialAccountRepository.save(account);
      }

      // Add 1-5 favorite genres
      const randomGenres = genres
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.floor(Math.random() * 5) + 1);

      for (const genre of randomGenres) {
        await favoriteGenreRepository.save({
          userId: user.userId,
          genreId: genre.genreId,
        });
      }
    }

    console.log('Users seeded successfully!');
    console.log(`   - 1 admin user (admin / Admin123)`);
    console.log(`   - 3 test users (artist1, artist2, listener1 / Password123)`);
    console.log(`   - 1 suspended user (listener2 / Password123)`);
    console.log(`   - 1 unverified user (listener3 / Password123)`);
    console.log(`   - 50 random users (all password: Password123)`);
  }
}
