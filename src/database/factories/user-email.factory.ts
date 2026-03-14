import { setSeederFactory } from 'typeorm-extension';
import { UserEmail } from '../../user/entities/user-email.entity';

export default setSeederFactory(UserEmail, async () => {
  const { faker } = await import('@faker-js/faker');
  const email = new UserEmail();

  email.email = faker.internet.email().toLowerCase();
  email.is_primary = true;
  email.is_verified = faker.helpers.arrayElement([true, true, true, false]);
  email.verified_at = email.is_verified ? faker.date.past() : null;

  return email;
});
