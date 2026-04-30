import { Entity, Column, OneToMany, PrimaryGeneratedColumn, OneToOne } from 'typeorm';
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
import { Settings } from '../../settings/entities/settings.entity';
import { Subscription } from '../../subscription/entities/subscription.entity';
import { DownloadedTrack } from '../../download/entities/downloaded-tracks.entity';
import { DownloadedPlaylist } from '../../download/entities/downloaded-playlists.entity';
import { SpotlightTrack } from '../../track/entities/spotlght-track.entity';

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
  plan!: string; // 'free' | 'go+' | 'pro'

  @Column({ type: 'boolean', default: true, name: 'is_public' })
  isPublic!: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_suspended' })
  isSuspended!: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'suspension_reason' })
  suspensionReason!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'support_link' })
  supportLink!: string;

  @Column({ type: 'int', default: 0, name: 'playlist_count' })
  playlistCount!: number;

  @Column({ type: 'int', default: 0, name: 'track_count' })
  trackCount!: number;

  @Column({ type: 'int', default: 0, name: 'followers_count' })
  followersCount!: number;

  @Column({ type: 'int', default: 0, name: 'followings_count' })
  followingsCount!: number;

  @Column({ type: 'int', default: 0, name: 'reposts_count' })
  repostsCount!: number;

  @Column({ type: 'int', default: 0, name: 'favorites_count' })
  favoritesCount!: number;

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
  likedPlaylists!: PlaylistLike[];

  @OneToMany(() => PlaylistRepost, (repost) => repost.user)
  repostedPlaylists!: PlaylistRepost[];

  @OneToMany(() => TrackLikes, (trackLikes) => trackLikes.user)
  trackLikes!: TrackLikes[];

  @OneToMany(() => Track, (track) => track.user)
  tracks!: Track[];

  @OneToMany(() => TrackComment, (comment) => comment.user)
  trackComments!: TrackComment[];

  @OneToMany(() => TrackRepost, (repost) => repost.user)
  trackReposts!: TrackRepost[];

  @OneToOne(() => Settings, (settings) => settings.user)
  settings!: Settings;

  @OneToOne(() => Subscription, (subscription) => subscription.user)
  subscription!: Subscription;

  @OneToMany(() => DownloadedTrack, (dt) => dt.user)
  downloadedTracks!: DownloadedTrack[];

  @OneToMany(() => DownloadedPlaylist, (dp) => dp.user)
  downloadedPlaylists!: DownloadedPlaylist[];

  @OneToMany(() => SpotlightTrack, (spotlight) => spotlight.user)
  spotlightTracks!: SpotlightTrack[];
}
