import { Entity, Column, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { UserEmail } from './user-email.entity';
import { ExternalProfile } from './external-profile.entity';
import { SocialAccount } from './social-account.entity';
import { FavoriteGenre } from './favorite-genre.entity';
import { Playlist } from '../../playlist/entities/playlist.entity';
import { PlaylistLike } from '../../playlist/entities/playlist-likes.entity';
import { PlaylistRepost } from '../../playlist/entities/playlist-reposts.entity';
import { TrackLikes } from '../../track/entities/track-likes.entity';
import { Track } from '../../track/entities/track.entity';
import { TrackComment } from '../../track/entities/track-comments.entity';
import { TrackRepost } from '../../track/entities/track-reposts.entity';

@Entity('users')
export class User extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'first_name' })
  firstName!: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'last_name' })
  lastName!: string;

  @Column({ type: 'varchar', length: 150, nullable: true, name: 'display_name' })
  displayName!: string;

  @Column({ type: 'date', nullable: true })
  birthdate!: Date;

  @Column({ type: 'varchar', length: 20, nullable: true })
  gender!: string;

  @Column({ type: 'text', nullable: true })
  bio!: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'avatar_url' })
  avatarUrl!: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'cover_photo' })
  coverPhoto!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city!: string;

  @Column({ type: 'varchar', length: 20, default: 'listener' })
  role!: string; // 'listener' | 'artist' | 'admin'

  @Column({ type: 'varchar', length: 20, default: 'free' })
  plan!: string; // 'free' | 'pro' | 'premium'

  @Column({ type: 'boolean', default: true, name: 'is_public' })
  isPublic!: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_suspended' })
  isSuspended!: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'suspension_reason' })
  suspensionReason!: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'support_link' })
  supportLink!: string;

  // Relationships
  @OneToMany(() => UserEmail, (email) => email.user)
  emails!: UserEmail[];

  @OneToMany(() => ExternalProfile, (profile) => profile.user)
  externalProfiles!: ExternalProfile[];

  @OneToMany(() => SocialAccount, (account) => account.user)
  socialAccounts!: SocialAccount[];

  @OneToMany(() => FavoriteGenre, (favorite) => favorite.user)
  favoriteGenres!: FavoriteGenre[];

  @OneToMany(() => Playlist, (playlist) => playlist.user)
  playlists!: Playlist[];

  @OneToMany(() => PlaylistLike, (like) => like.user)
  liked_playlists!: PlaylistLike[];

  @OneToMany(() => PlaylistRepost, (repost) => repost.user)
  reposted_playlists!: PlaylistRepost[];

  @OneToMany(() => TrackLikes, (trackLikes) => trackLikes.user)
  trackLikes!: TrackLikes[];

  @OneToMany(() => Track, (track) => track.user)
  tracks!: Track[];

  @OneToMany(() => TrackComment, (comment) => comment.user)
  trackComments!: TrackComment[];

  @OneToMany(() => TrackRepost, (repost) => repost.user)
  trackReposts!: TrackRepost[];
}
