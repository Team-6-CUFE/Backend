import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  Relation,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { PlaylistLike } from './playlist-likes.entity';
import { PlaylistRepost } from './playlist-reposts.entity';
import { PlaylistTrack } from './playlist-tracks.entity';
import { Tag } from '../../track/entities/tag.entity';

@Entity('playlists')
export class Playlist extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'playlist_id' })
  playlistId!: string;

  @Column({ type: 'varchar', length: 255, name: 'title' })
  title!: string;

  @Column({ type: 'text', nullable: true, name: 'description' })
  description?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'cover_image' })
  coverImage?: string;

  @Column({ type: 'boolean', default: false, name: 'is_public' })
  isPublic!: boolean;

  @Column({ type: 'int', default: 0, name: 'likes_count' })
  likesCount!: number;

  @Column({ type: 'int', default: 0, name: 'reposts_count' })
  repostsCount!: number;

  @Column({ type: 'int', default: 0, name: 'total_duration_seconds' })
  totalDurationSeconds!: number;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'int', name: 'tracks_count' })
  tracksCount!: number;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'secret_token' })
  secretToken?: string | null;

  // Relationship
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;

  @OneToMany(() => PlaylistLike, (like) => like.playlist)
  likes!: Relation<PlaylistLike[]>;

  @OneToMany(() => PlaylistRepost, (repost) => repost.playlist)
  reposts!: Relation<PlaylistRepost[]>;

  @OneToMany('PlaylistTrack', (playlistTrack: PlaylistTrack) => playlistTrack.playlist)
  playlistTracks!: PlaylistTrack[];

  @ManyToMany(() => Tag, (tag) => tag.playlists)
  @JoinTable({
    name: 'playlist_tags',
    joinColumn: { name: 'playlist_id', referencedColumnName: 'playlistId' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'tagId' },
  })
  tags!: Tag[];
}
