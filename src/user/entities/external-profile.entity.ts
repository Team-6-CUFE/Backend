import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from './user.entity';

@Entity('external_profiles')
export class ExternalProfile extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 50 })
  name!: string; // 'instagram', 'twitter', etc.

  @Column({ type: 'varchar', length: 500 })
  url!: string; // The actual link

  // Relationship
  @ManyToOne(() => User, (user) => user.externalProfiles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;
}
