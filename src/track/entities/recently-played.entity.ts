import { Entity, Column, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum RecentlyPlayedItemType {
  ARTIST = 'artist',
  PLAYLIST = 'playlist',
}

@Entity('recently_played')
export class RecentlyPlayed {
  @Column({ name: 'user_id', type: 'uuid', primary: true })
  userId!: string;

  @Column({ name: 'item_id', type: 'uuid', primary: true })
  itemId!: string;

  @Column({
    name: 'item_type',
    type: 'enum',
    enum: RecentlyPlayedItemType,
    primary: true,
  })
  itemType!: RecentlyPlayedItemType;

  @Column({ name: 'played_at', type: 'timestamptz', default: () => 'NOW()' })
  playedAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;
}
