import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn, Relation } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('user_blocks')
export class UserBlock {
  @PrimaryColumn({ type: 'uuid' })
  blocker!: string;

  @PrimaryColumn({ type: 'uuid' })
  blocked!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blocker' })
  blockerUser!: Relation<User>;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blocked' })
  blockedUser!: Relation<User>;
}
