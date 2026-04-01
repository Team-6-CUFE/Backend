import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCommentParentId1774964276581 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add comment parent_id column to track_comments table
    await queryRunner.query(`
        ALTER TABLE track_comments
        ADD COLUMN parent_id UUID
        REFERENCES track_comments(comment_id)
        ON DELETE CASCADE;
        `);

    // Add index for parent_id lookup
    await queryRunner.query(`
        CREATE INDEX idx_track_comments_parent_id
        ON track_comments(parent_id);
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`
        DROP INDEX IF EXISTS idx_track_comments_parent_id;
        `);

    // Drop the parent_id column
    await queryRunner.query(`
        ALTER TABLE track_comments
        DROP COLUMN IF EXISTS parent_id;
        `);
  }
}
