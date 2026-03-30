import { setSeederFactory } from 'typeorm-extension';
import { UserEmail } from '../../user/entities/user-email.entity';

export default setSeederFactory(UserEmail, async () => {
  const { faker } = await import('@faker-js/faker');
  const email = new UserEmail();

  email.email = faker.internet.email().toLowerCase();
  email.isPrimary = true;
  email.isVerified = faker.helpers.arrayElement([true, true, true, false]);
  email.verifiedAt = email.isVerified ? faker.date.past() : null;

  return email;
});
