import { setSeederFactory } from 'typeorm-extension';
import { SocialAccount } from '../../user/entities/social-account.entity';

export default setSeederFactory(SocialAccount, async () => {
  const { faker } = await import('@faker-js/faker');
  const account = new SocialAccount();

  account.provider = faker.helpers.arrayElement(['google', 'facebook']);
  account.providerId = faker.string.uuid();
  account.providerEmail = faker.internet.email().toLowerCase();

  return account;
});
