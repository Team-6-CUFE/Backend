import { setSeederFactory } from 'typeorm-extension';
import { SocialAccount } from '../../user/entities/social-account.entity';

export default setSeederFactory(SocialAccount, async () => {
  const { faker } = await import('@faker-js/faker');
  const account = new SocialAccount();

  account.provider = faker.helpers.arrayElement(['google', 'facebook']);
  account.provider_id = faker.string.uuid();
  account.provider_email = faker.internet.email().toLowerCase();

  return account;
});
