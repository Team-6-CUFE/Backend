import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateActivitiesAndNotificationsTables1773951486449 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE activities (
        activity_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        activity_type VARCHAR(50)  NOT NULL,
        target_id     UUID         NOT NULL,
        user_id       UUID         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_activities_user ON activities(user_id);`);
    await queryRunner.query(`CREATE INDEX idx_activities_type ON activities(activity_type);`);
    await queryRunner.query(`CREATE INDEX idx_activities_target ON activities(target_id);`);
    await queryRunner.query(`CREATE INDEX idx_activities_created ON activities(created_at DESC);`);

    await queryRunner.query(`
      CREATE TABLE notifications (
        notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        is_read         BOOLEAN   DEFAULT false,
        user_id         UUID      NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        activity_id     UUID      NOT NULL REFERENCES activities(activity_id) ON DELETE CASCADE,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_notifications_user ON notifications(user_id);`);
    await queryRunner.query(
      `CREATE INDEX idx_notifications_read ON notifications(user_id, is_read);`
    );
    await queryRunner.query(
      `CREATE INDEX idx_notifications_activity ON notifications(activity_id);`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS notifications CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS activities CASCADE;`);
  }
}
