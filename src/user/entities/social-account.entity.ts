import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn, Relation } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from './user.entity';

@Entity('social_accounts')
export class SocialAccount extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 255, unique: true })
  provider_id!: string;

  @PrimaryColumn({ type: 'varchar', length: 20 })
  provider!: string; // 'google', 'facebook'

  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  provider_email!: string;

  // Relationship
  @ManyToOne(() => User, (user) => user.social_accounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;
}
