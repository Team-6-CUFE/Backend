import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn, Relation } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from './user.entity';

@Entity('social_accounts')
export class SocialAccount extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 255, unique: true, name: 'provider_id' })
  providerId!: string;

  @PrimaryColumn({ type: 'varchar', length: 20 })
  provider!: string; // 'google', 'facebook'

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'provider_email' })
  providerEmail!: string;

  // Relationship
  @ManyToOne(() => User, (user) => user.socialAccounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;
}
