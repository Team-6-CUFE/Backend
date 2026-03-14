import { DataSource, DataSourceOptions } from 'typeorm';
import { runSeeder } from 'typeorm-extension';
import { UserSeeder } from './user.seeder.ts';
import ormConfig from '../../../ormconfig.ts';

async function main() {
  // Use the .default if it's imported as a module object
  const config = (ormConfig as any).default || ormConfig;
  const dataSource = new DataSource(config);
  await dataSource.initialize();

  // Run UserSeeder
  await runSeeder(dataSource, UserSeeder);

  await dataSource.destroy();
  console.log('Seeding complete!');
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
