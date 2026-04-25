import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class UpdateNotificationsTargets1777039572847 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Update the Enum to include the missing types
    // PostgreSQL requires raw SQL to append values to an existing ENUM
    await queryRunner.query(`ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_post';`);
    await queryRunner.query(`ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'message';`);

    // 2. Add the new columns
    await queryRunner.addColumns('notifications', [
      new TableColumn({
        name: 'track_id',
        type: 'uuid',
        isNullable: true,
      }),
      new TableColumn({
        name: 'playlist_id',
        type: 'uuid',
        isNullable: true,
      }),
      new TableColumn({
        name: 'message_id',
        type: 'uuid',
        isNullable: true,
      }),
    ]);

    // 3. Add the foreign keys to link to your tracks and playlists tables
    await queryRunner.createForeignKeys('notifications', [
      new TableForeignKey({
        columnNames: ['track_id'],
        referencedColumnNames: ['track_id'],
        referencedTableName: 'tracks',
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['playlist_id'],
        referencedColumnNames: ['playlist_id'],
        referencedTableName: 'playlists',
        onDelete: 'CASCADE',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('notifications');

    if (table) {
      // 1. Drop foreign keys
      const foreignKeys = table.foreignKeys.filter(
        (fk) => fk.columnNames.includes('track_id') || fk.columnNames.includes('playlist_id')
      );
      if (foreignKeys.length > 0) {
        await queryRunner.dropForeignKeys('notifications', foreignKeys);
      }

      // 2. Drop columns
      await queryRunner.dropColumns('notifications', ['track_id', 'playlist_id', 'message_id']);
    }
  }
}
