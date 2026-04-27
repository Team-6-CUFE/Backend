import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubscriptionTable1777243196612 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE subscription_plan_enum AS ENUM (
        'free',
        'pro_monthly',
        'pro_yearly',
        'go+_monthly',
        'go+_yearly'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE subscription_status_enum AS ENUM (
        'active',
        'cancelled',
        'past_due',
        'trialing',
        'incomplete'
      );
    `);

    // Subscriptions table
    await queryRunner.query(`
      CREATE TABLE subscriptions (
        subscription_id        UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id                UUID                     NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        stripe_customer_id     VARCHAR                  UNIQUE NOT NULL,
        stripe_subscription_id VARCHAR                  UNIQUE,
        stripe_price_id        VARCHAR,
        plan                   subscription_plan_enum   NOT NULL DEFAULT 'free',
        status                 subscription_status_enum NOT NULL DEFAULT 'active',
        current_period_start   TIMESTAMP,
        current_period_end     TIMESTAMP,
        cancel_at_period_end   BOOLEAN                  NOT NULL DEFAULT false,
        created_at             TIMESTAMP                DEFAULT CURRENT_TIMESTAMP,
        updated_at             TIMESTAMP                DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Indexes
    await queryRunner.query(`
      CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_subscriptions_status ON subscriptions(status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS subscriptions CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS subscription_plan_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS subscription_status_enum;`);
  }
}
