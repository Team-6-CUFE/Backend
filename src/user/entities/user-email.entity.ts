import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from './user.entity';

@Entity('user_emails')
export class UserEmail extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'boolean', default: false })
  is_primary!: boolean;

  @Column({ type: 'boolean', default: false })
  is_verified!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verified_at!: Date;

  // Relationship
  @ManyToOne(() => User, (user) => user.emails, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
