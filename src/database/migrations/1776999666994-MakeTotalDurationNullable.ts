import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class MakeTotalDurationNullable1776999666994 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      'playlists',
      'total_duration_seconds',
      new TableColumn({
        name: 'total_duration_seconds',
        type: 'int',
        isNullable: true, // This is the fix
        default: 0,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: This might fail if there are existing NULL rows when reverting
    await queryRunner.changeColumn(
      'playlists',
      'total_duration_seconds',
      new TableColumn({
        name: 'total_duration_seconds',
        type: 'int',
        isNullable: false,
        default: 0,
      })
    );
  }
}
