import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCountriesToUsers1777542147752 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE "users" 
            SET "country" = 'England'
            WHERE "country" IS NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // nothing to undo since we are just filling in missing data
  }
}
