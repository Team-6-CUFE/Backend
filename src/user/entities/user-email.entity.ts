import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from './user.entity';

@Entity('user_emails')
export class UserEmail extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'boolean', default: false, name: 'is_primary' })
  isPrimary!: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_verified' })
  isVerified!: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'verified_at' })
  verifiedAt!: Date | null;

  // Relationship
  @ManyToOne(() => User, (user) => user.emails, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
