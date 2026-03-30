import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn, Relation } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('user_follows')
export class UserFollow {
  @PrimaryColumn({ type: 'uuid' })
  follower!: string;

  @PrimaryColumn({ type: 'uuid' })
  followed!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'follower' })
  followerUser!: Relation<User>;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'followed' })
  followedUser!: Relation<User>;
}
