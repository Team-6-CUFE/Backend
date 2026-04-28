import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';

export enum SubscriptionPlan {
  FREE = 'free',
  PRO_MONTHLY = 'pro_monthly',
  PRO_YEARLY = 'pro_yearly',
  GO_PLUS_MONTHLY = 'go+_monthly',
  GO_PLUS_YEARLY = 'go+_yearly',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  PAST_DUE = 'past_due',
  TRIALING = 'trialing',
  INCOMPLETE = 'incomplete',
}

@Entity('subscriptions')
export class Subscription extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'subscription_id' })
  subscriptionId!: string;

  // Stripe identifiers
  @Column({ type: 'varchar', unique: true, name: 'stripe_customer_id' })
  stripeCustomerId!: string;

  @Column({ type: 'varchar', unique: true, nullable: true, name: 'stripe_subscription_id' })
  stripeSubscriptionId!: string;

  @Column({ type: 'varchar', nullable: true, name: 'stripe_price_id' })
  stripePriceId!: string;

  // Plan & Status
  @Column({
    type: 'enum',
    enum: SubscriptionPlan,
    default: SubscriptionPlan.FREE,
  })
  plan!: SubscriptionPlan;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status!: SubscriptionStatus;

  // Billing cycle dates
  @Column({ type: 'timestamp', nullable: true, name: 'current_period_start' })
  currentPeriodStart!: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'current_period_end' })
  currentPeriodEnd!: Date;

  // Cancellation
  @Column({ type: 'boolean', default: false, name: 'cancel_at_period_end' })
  cancelAtPeriodEnd!: boolean;

  // Relation
  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
