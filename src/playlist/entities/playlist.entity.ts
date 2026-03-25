import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  Relation,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { PlaylistLike } from './playlist-likes';
import { PlaylistRepost } from './playlist-reposts';

@Entity('playlists')
export class Playlist extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  playlist_id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cover_image?: string;

  @Column({ type: 'boolean', default: false })
  is_public!: boolean;

  @Column({ type: 'int', default: 0 })
  likes_count!: number;

  @Column({ type: 'int', default: 0 })
  reposts_count!: number;

  @Column({ type: 'uuid' })
  user_id!: string;

  // Relationship
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;

  @OneToMany(() => PlaylistLike, (like) => like.playlist)
  likes!: Relation<PlaylistLike[]>;

  @OneToMany(() => PlaylistRepost, (repost) => repost.playlist)
  reposts!: Relation<PlaylistRepost[]>;
}
