import { setSeederFactory } from 'typeorm-extension';
import * as bcrypt from 'bcrypt';
import { User } from '../../user/entities/user.entity';

export default setSeederFactory(User, async () => {
  const { faker } = await import('@faker-js/faker');
  const user = new User();

  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  user.username = faker.internet.username({ firstName, lastName }).toLowerCase();
  user.password_hash = await bcrypt.hash('password123', 10); // Same password for all test users
  user.first_name = firstName;
  user.last_name = lastName;
  user.display_name = `${firstName} ${lastName}`;
  user.birthdate = faker.date.birthdate({ min: 13, max: 65, mode: 'age' });
  user.gender = faker.helpers.arrayElement(['male', 'female', 'other', 'prefer_not_to_say']);
  user.bio = faker.lorem.sentence();
  user.avatar_url = faker.image.avatar();
  user.country = faker.location.country();
  user.city = faker.location.city();
  user.role = faker.helpers.arrayElement(['listener', 'artist']);
  user.plan = faker.helpers.weightedArrayElement([
    { weight: 7, value: 'free' },
    { weight: 2, value: 'pro' },
    { weight: 1, value: 'go+' },
  ]);
  user.is_public = faker.helpers.arrayElement([true, true, true, false]); // 75% public
  user.is_suspended = false;

  return user;
});
