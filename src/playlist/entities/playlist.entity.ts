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
  OneToOne,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { PlaylistLike } from './playlist-likes.entity';
import { PlaylistRepost } from './playlist-reposts.entity';
import { PlaylistTrack } from './playlist-tracks.entity';
import { Genre } from '../../genre/entities/genre.entity'; // Import Genre Entity
import { Track } from '../../track/entities/track.entity';

export enum PlaylistType {
  PLAYLIST = 'Playlist',
  ALBUM = 'Album',
  EP = 'EP',
  SINGLE = 'Single',
  COMPILATION = 'Compilation',
  STATION = 'Station',
}

export type PlaylistTypeFilter = 'playlist' | 'station' | 'album';

export const ALBUM_TYPES = [
  PlaylistType.ALBUM,
  PlaylistType.EP,
  PlaylistType.SINGLE,
  PlaylistType.COMPILATION,
];

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

  @Column({ type: 'int', default: 0, name: 'tracks_count' })
  tracksCount!: number;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'secret_token' })
  secretToken?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'buy_link' })
  buyLink?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'record_label' })
  recordLabel?: string;

  @Column({
    type: 'enum',
    enum: PlaylistType,
    default: PlaylistType.PLAYLIST,
    name: 'type',
  })
  type!: PlaylistType;

  @Column({ type: 'date', name: 'release_date', default: () => 'CURRENT_DATE' })
  releaseDate!: Date;

  @Column({ type: 'varchar', length: 255, unique: true, name: 'permalink', nullable: true })
  permalink!: string;

  @Column({ name: 'genre_id', type: 'uuid', nullable: true })
  genreId!: string | null;

  @Column({ name: 'track_id', type: 'uuid', nullable: true })
  trackId!: string | null;

  @OneToOne(() => Track, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'track_id' })
  track!: Relation<Track> | null;

  @ManyToOne(() => Genre, (genre) => genre.playlists, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'genre_id' })
  genre!: Relation<Genre> | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;

  @OneToMany(() => PlaylistLike, (like) => like.playlist)
  likes!: Relation<PlaylistLike[]>;

  @OneToMany(() => PlaylistRepost, (repost) => repost.playlist)
  reposts!: Relation<PlaylistRepost[]>;

  @OneToMany('PlaylistTrack', (playlistTrack: PlaylistTrack) => playlistTrack.playlist)
  playlistTracks!: PlaylistTrack[];

  @ManyToMany(() => Genre, (genre) => genre.playlistTags)
  @JoinTable({
    name: 'playlist_tags',
    joinColumn: { name: 'playlist_id', referencedColumnName: 'playlistId' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'genreId' },
  })
  tags!: Genre[];
}
