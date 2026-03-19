import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn, Relation } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('user_follows')
export class UserFollow {
  @PrimaryColumn({ type: 'uuid' })
  follower!: string;

  @PrimaryColumn({ type: 'uuid' })
  followed!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'follower' })
  follower_user!: Relation<User>;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'followed' })
  followed_user!: Relation<User>;
}
