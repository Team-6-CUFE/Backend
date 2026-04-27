import { setSeederFactory } from 'typeorm-extension';
import * as bcrypt from 'bcrypt';
import { User } from '../../user/entities/user.entity';

export default setSeederFactory(User, async () => {
  const { faker } = await import('@faker-js/faker');
  const user = new User();

  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  user.username = faker.internet.username({ firstName, lastName }).toLowerCase();
  user.passwordHash = await bcrypt.hash('Password123', 10); // Same password for all test users
  user.firstName = firstName;
  user.lastName = lastName;
  user.displayName = `${firstName} ${lastName}`;
  user.birthdate = faker.date.birthdate({ min: 13, max: 65, mode: 'age' });
  user.gender = faker.helpers.arrayElement(['male', 'female', 'other', 'preferNotToSay']);
  user.bio = faker.lorem.sentence();
  user.country = faker.location.country();
  user.city = faker.location.city();
  user.plan = faker.helpers.weightedArrayElement([
    { weight: 7, value: 'free' },
    { weight: 2, value: 'pro' },
    { weight: 1, value: 'go+' },
  ]);
  user.role = user.plan === 'pro' ? 'artist' : 'listener'; // Pro users are artists, others are listeners
  user.isPublic = faker.helpers.arrayElement([true, true, true, false]); // 75% public
  user.isSuspended = false;

  return user;
});
