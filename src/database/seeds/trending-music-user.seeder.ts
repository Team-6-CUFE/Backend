import { Seeder } from 'typeorm-extension';
import { TRENDING_MUSIC_USER } from '../../user/trending-music-user.constants';
import { User } from '../../user/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { UserEmail } from '../../user/entities/user-email.entity';
import { Settings } from '../../settings/entities/settings.entity';
import { mapUser, addDocuments } from '../../search/indexing';

export class TrendingMusicUserSeeder implements Seeder {
  public async run(dataSource: any): Promise<void> {
    const existingUser = await dataSource
      .getRepository(User)
      .findOne({ where: { username: TRENDING_MUSIC_USER.username } });
    if (existingUser) {
      console.log('Trending music user already exists. Skipping seeding.');
      return;
    }
    const userRepository = dataSource.getRepository(User);
    const emailRepository = dataSource.getRepository(UserEmail);
    const settingsRepository = dataSource.getRepository(Settings);

    const trendingMusic = userRepository.create({
      ...TRENDING_MUSIC_USER,
      passwordHash: await bcrypt.hash('Password123', 10),
    });
    var trendingMusicUser = await userRepository.save(trendingMusic);
    await addDocuments([mapUser(trendingMusicUser)]);
    const settings = settingsRepository.create({
      userId: trendingMusicUser.userId,
    });
    await settingsRepository.save(settings);

    const email = emailRepository.create({
      userId: trendingMusicUser.userId,
      email: TRENDING_MUSIC_USER.email,
      isPrimary: true,
      isVerified: true,
      verifiedAt: new Date(),
    });
    await emailRepository.save(email);

    console.log('Trending music user seeding completed.');
  }
}
