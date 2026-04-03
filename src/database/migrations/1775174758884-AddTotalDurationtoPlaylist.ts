import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTotalDurationtoPlaylist1775174758884 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'playlists',
      new TableColumn({
        name: 'total_duration_seconds',
        type: 'int',
        isNullable: false,
        default: 0,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('playlists', 'total_duration_seconds');
  }
}
