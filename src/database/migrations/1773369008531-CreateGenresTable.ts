// database/migrations/1773368421890-CreateGenresTable.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGenresTable1773368421890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create genres table
    await queryRunner.query(`
      CREATE TABLE genres (
        genre_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create index for genres
    await queryRunner.query(`
      CREATE INDEX idx_genres_name ON genres(name);
    `);

    // Create favorite_genres junction table (many-to-many: users <-> genres)
    await queryRunner.query(`
      CREATE TABLE favorite_genres (
        user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        genre_id UUID NOT NULL REFERENCES genres(genre_id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, genre_id)
      );
    `);

    // Create indexes for favorite_genres
    await queryRunner.query(`
      CREATE INDEX idx_favorite_genres_user ON favorite_genres(user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_favorite_genres_genre ON favorite_genres(genre_id);
    `);

    // Apply trigger to genres table
    await queryRunner.query(`
      CREATE TRIGGER update_genres_updated_at 
      BEFORE UPDATE ON genres
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column();
    `);

    // Seed initial genres
    await queryRunner.query(`
      INSERT INTO genres (name, description) VALUES
      ('Electronic', 'Electronic music including house, techno, and EDM'),
      ('Hip Hop', 'Hip hop and rap music'),
      ('Rock', 'Rock and alternative rock'),
      ('Pop', 'Popular music'),
      ('Jazz', 'Jazz and blues'),
      ('Classical', 'Classical and orchestral music'),
      ('R&B', 'Rhythm and blues'),
      ('Country', 'Country and folk music'),
      ('Reggae', 'Reggae and dancehall'),
      ('Metal', 'Heavy metal and hard rock'),
      ('Indie', 'Independent and alternative music'),
      ('Soul', 'Soul and funk'),
      ('Techno', 'Techno and minimal techno'),
      ('House', 'House music'),
      ('Dubstep', 'Dubstep and bass music'),
      ('Trap', 'Trap music'),
      ('Ambient', 'Ambient and experimental'),
      ('Disco', 'Disco and funk'),
      ('Punk', 'Punk rock'),
      ('Lo-fi', 'Lo-fi hip hop and chill beats')
      ON CONFLICT (name) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_genres_updated_at ON genres;`);

    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS favorite_genres CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS genres CASCADE;`);
  }
}
