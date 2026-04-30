import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSpotlightTracksTable1777540641921 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "spotlight_tracks" (
                "spotlight_track_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id"            uuid NOT NULL,
                "track_id"           uuid NOT NULL,
                "created_at"         TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at"         TIMESTAMP NOT NULL DEFAULT now(),
 
                CONSTRAINT "PK_spotlight_tracks"
                    PRIMARY KEY ("spotlight_track_id"),
 
                CONSTRAINT "UQ_spotlight_tracks_user_track"
                    UNIQUE ("user_id", "track_id"),
 
                CONSTRAINT "FK_spotlight_tracks_user"
                    FOREIGN KEY ("user_id")
                    REFERENCES "users" ("user_id")
                    ON DELETE CASCADE,
 
                CONSTRAINT "FK_spotlight_tracks_track"
                    FOREIGN KEY ("track_id")
                    REFERENCES "tracks" ("track_id")
                    ON DELETE CASCADE
            )
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_spotlight_tracks_user_id"
                ON "spotlight_tracks" ("user_id")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_spotlight_tracks_track_id"
                ON "spotlight_tracks" ("track_id")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_spotlight_tracks_track_id"`);
    await queryRunner.query(`DROP INDEX "IDX_spotlight_tracks_user_id"`);
    await queryRunner.query(`DROP TABLE "spotlight_tracks"`);
  }
}
