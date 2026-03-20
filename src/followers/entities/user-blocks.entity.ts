import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn, Relation } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('user_blocks')
export class UserBlock {
  @PrimaryColumn({ type: 'uuid' })
  blocker!: string;

  @PrimaryColumn({ type: 'uuid' })
  blocked!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blocker' })
  blocker_user!: Relation<User>;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blocked' })
  blocked_user!: Relation<User>;
}
