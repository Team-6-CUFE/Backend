import { setSeederFactory } from 'typeorm-extension';
import { ExternalProfile } from '../../user/entities/external-profile.entity';

const socialPlatforms = [
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

export default setSeederFactory(ExternalProfile, async () => {
  const { faker } = await import('@faker-js/faker');
  const profile = new ExternalProfile();

  const platform = faker.helpers.arrayElement(socialPlatforms);
  profile.name = platform;
  profile.url = `https://${platform}.com/${faker.internet.username()}`;

  return profile;
});
