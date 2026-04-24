import { Seeder } from 'typeorm-extension';
import { trendingMusicUser } from '../../user/trending-music-user.constants';
import { User } from '../../user/entities/user.entity';

export class TrendingMusicUserSeeder implements Seeder {
  public async run(dataSource: any): Promise<void> {
    const existingUser = await dataSource
      .getRepository(User)
      .findOne({ where: { username: trendingMusicUser.username } });
    if (existingUser) {
      console.log('Trending music user already exists. Skipping seeding.');
      return;
    }
    await dataSource.getRepository(User).save(trendingMusicUser);
    console.log('Trending music user seeding completed.');
  }
}
