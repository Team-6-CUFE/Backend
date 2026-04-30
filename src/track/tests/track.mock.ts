import { TrackVisibility } from '../enums/track-visibility.enum';
import { TrackStatus } from '../enums/track-status.enum';

// ─── UUIDs ────────────────────────────────────────────────────────────────────

export const MOCK_TRACK_ID = '123e4567-e89b-12d3-a456-426614174000';
export const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
export const MOCK_OTHER_USER_ID = '550e8400-e29b-41d4-a716-446655440099';
export const MOCK_ARTIST_ID = '550e8400-e29b-41d4-a716-446655440002';
export const MOCK_MY_USER_ID = '550e8400-e29b-41d4-a716-446655440003';
export const MOCK_COMMENT_ID = '660e8400-e29b-41d4-a716-446655440010';
export const MOCK_PARENT_COMMENT_ID = '660e8400-e29b-41d4-a716-446655440011';
export const MOCK_PLAYLIST_ID = '770e8400-e29b-41d4-a716-446655440020';
export const MOCK_GENRE_ID = '880e8400-e29b-41d4-a716-446655440030';
export const MOCK_TAG_ID = '990e8400-e29b-41d4-a716-446655440040';

// ─── Track factories ──────────────────────────────────────────────────────────

export const mockPublicTrack = (overrides?: object) => ({
  trackId: MOCK_TRACK_ID,
  userId: MOCK_OTHER_USER_ID,
  title: 'Midnight Drive',
  description: 'A lo-fi track',
  audioUrl: 'https://s3.amazonaws.com/audio/track.mp3',
  audioUrlHq: 'https://s3.amazonaws.com/audio/track_hq.mp3',
  coverImage: 'https://s3.amazonaws.com/covers/track.jpg',
  waveformUrl: 'https://s3.amazonaws.com/waveforms/track.json',
  previewAudioUrl: 'https://s3.amazonaws.com/previews/track.mp3',
  previewStartTime: '00:00:30',
  durationSeconds: 213,
  trackStatus: TrackStatus.FINISHED,
  visibility: TrackVisibility.PUBLIC,
  explicitContent: false,
  blockedRegions: [] as string[],
  playCount: 0,
  likesCount: 0,
  repostsCount: 0,
  commentsCount: 0,
  releaseDate: null,
  createdAt: new Date('2024-06-01T10:00:00Z'),
  updatedAt: new Date('2024-06-01T10:00:00Z'),
  genres: [],
  tags: [],
  user: {
    userId: MOCK_OTHER_USER_ID,
    username: 'dj_nour',
    displayName: 'Nour',
    avatarUrl: 'https://s3.amazonaws.com/avatars/nour.jpg',
  },
  allowComments: true,
  showComments: true,
  ...overrides,
});

export const mockPrivateTrack = (overrides?: object) =>
  mockPublicTrack({
    userId: MOCK_OTHER_USER_ID,
    visibility: TrackVisibility.PRIVATE,
    ...overrides,
  });

export const mockOwnTrack = (overrides?: object) =>
  mockPublicTrack({ userId: MOCK_USER_ID, ...overrides });

export const mockProcessingTrack = (overrides?: object) =>
  mockPublicTrack({
    trackStatus: TrackStatus.PROCESSING,
    audioUrl: null,
    audioUrlHq: null,
    ...overrides,
  });

export const mockTrackWithRelations = (overrides?: object) =>
  mockPublicTrack({
    genres: [{ genreId: MOCK_GENRE_ID, name: 'Electronic' }],
    tags: [{ tagId: MOCK_TAG_ID, name: 'lo-fi' }],
    user: {
      userId: MOCK_OTHER_USER_ID,
      username: 'dj_nour',
      displayName: 'Nour',
      avatarUrl: 'https://s3.amazonaws.com/avatars/nour.jpg',
    },
    ...overrides,
  });

// ─── User factories ───────────────────────────────────────────────────────────

export const mockPublicUser = (overrides?: object) => ({
  userId: MOCK_OTHER_USER_ID,
  username: 'other_user',
  displayName: 'Other User',
  avatarUrl: 'https://example.com/avatar.jpg',
  isPublic: true,
  plan: 'free',
  ...overrides,
});

export const mockPrivateUser = (overrides?: object) =>
  mockPublicUser({ isPublic: false, ...overrides });

export const mockProUser = (overrides?: object) => mockPublicUser({ plan: 'pro', ...overrides });

export const mockGoUser = (overrides?: object) => mockPublicUser({ plan: 'go+', ...overrides });

// ─── Repost factories ─────────────────────────────────────────────────────────

export const mockTrackRepost = (overrides?: object) => ({
  trackId: MOCK_TRACK_ID,
  userId: MOCK_USER_ID,
  caption: 'Great track!',
  createdAt: new Date('2024-06-01T12:00:00Z'),
  ...overrides,
});

export const mockRepostWithUser = (overrides?: object) => ({
  user: {
    userId: MOCK_OTHER_USER_ID,
    username: 'other_user',
    displayName: 'Other User',
    avatarUrl: 'https://example.com/avatar.jpg',
    followersCount: 120,
  },
  caption: 'Great track!',
  createdAt: new Date('2024-06-01T12:00:00Z'),
  ...overrides,
});

export const mockRepostWithTrack = (overrides?: object) => ({
  track: {
    trackId: MOCK_TRACK_ID,
    title: 'Midnight Drive',
    coverImage: 'https://s3.amazonaws.com/covers/midnight.jpg',
    durationSeconds: 213,
    playCount: 1500,
    repostsCount: 30,
    user: { userId: MOCK_ARTIST_ID, username: 'dj_nour', displayName: 'Nour' },
  },
  caption: 'Love this track!',
  createdAt: new Date('2024-06-01T12:00:00Z'),
  ...overrides,
});

// ─── Like factories ───────────────────────────────────────────────────────────

export const mockTrackLike = (overrides?: object) => ({
  trackId: MOCK_TRACK_ID,
  userId: MOCK_USER_ID,
  createdAt: new Date('2024-06-01T12:00:00Z'),
  ...overrides,
});

export const mockLikeWithUser = (overrides?: object) => ({
  user: {
    userId: MOCK_OTHER_USER_ID,
    username: 'other_user',
    displayName: 'Other User',
    avatarUrl: 'https://example.com/avatar.jpg',
    followersCount: 120,
  },
  createdAt: new Date('2024-06-01T12:00:00Z'),
  ...overrides,
});

export const mockLikeWithTrack = (overrides?: object) => ({
  track: {
    trackId: MOCK_TRACK_ID,
    title: 'Midnight Drive',
    coverImage: 'https://s3.amazonaws.com/covers/midnight.jpg',
    durationSeconds: 213,
    playCount: 1500,
    repostsCount: 30,
    user: { userId: MOCK_ARTIST_ID, username: 'dj_nour', displayName: 'Nour' },
  },
  createdAt: new Date('2024-06-01T12:00:00Z'),
  ...overrides,
});

// ─── Comment factories ────────────────────────────────────────────────────────

export const mockTrackComment = (overrides?: object) => ({
  commentId: MOCK_COMMENT_ID,
  trackId: MOCK_TRACK_ID,
  userId: MOCK_USER_ID,
  content: 'Great track!',
  timestampSeconds: 56,
  parentId: null,
  createdAt: new Date('2024-06-01T12:00:00Z'),
  user: {
    userId: MOCK_USER_ID,
    username: 'test_user',
    displayName: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
  },
  replies: [],
  ...overrides,
});

export const mockParentComment = (overrides?: object) => ({
  commentId: MOCK_PARENT_COMMENT_ID,
  trackId: MOCK_TRACK_ID,
  userId: MOCK_OTHER_USER_ID,
  content: 'Original comment',
  timestampSeconds: 30,
  parentId: null,
  createdAt: new Date('2024-06-01T11:00:00Z'),
  ...overrides,
});

// ─── Playlist factories ───────────────────────────────────────────────────────

export const mockPlaylistEntry = (overrides?: object) => ({
  playlist: {
    playlistId: MOCK_PLAYLIST_ID,
    title: 'Late Night Vibes',
    description: 'Chill tracks',
    coverImage: 'https://s3.amazonaws.com/covers/playlist.jpg',
    isPublic: true,
    tracksCount: 14,
    totalDurationSeconds: 3120,
    user: {
      userId: MOCK_OTHER_USER_ID,
      username: 'dj_nour',
      displayName: 'Nour',
      avatarUrl: 'https://s3.amazonaws.com/avatars/nour.jpg',
    },
  },
  addedAt: new Date('2024-06-01T12:00:00Z'),
  ...overrides,
});

// ─── Genre factories ──────────────────────────────────────────────────────────

export const mockGenre = (overrides?: object) => ({
  genreId: MOCK_GENRE_ID,
  name: 'Electronic',
  ...overrides,
});

// ─── JWT payload factories ────────────────────────────────────────────────────

export const mockJwtPayload = (overrides?: object) => ({
  sub: MOCK_USER_ID,
  email: 'test@example.com',
  role: 'listener' as const,
  plan: 'free' as const,
  ...overrides,
});

export const mockProJwtPayload = (overrides?: object) =>
  mockJwtPayload({ plan: 'pro', ...overrides });

export const mockGoJwtPayload = (overrides?: object) =>
  mockJwtPayload({ plan: 'go+', ...overrides });

// ─── Repository mock factories ────────────────────────────────────────────────

export const mockTrackRepository = () => ({
  findById: jest.fn(),
  findByIdWithRelations: jest.fn(),
  repostTrack: jest.fn(),
  didUserRepostTrack: jest.fn(),
  getTrackRepostsCount: jest.fn(),
  removeTrackRepost: jest.fn(),
  editTrackRepost: jest.fn(),
  getTrackReposts: jest.fn(),
  getUserTrackReposts: jest.fn(),
  didUserLikeTrack: jest.fn(),
  likeTrack: jest.fn(),
  getTrackLikesCount: jest.fn(),
  removeTrackLike: jest.fn(),
  getTrackLikes: jest.fn(),
  getUserTrackLikes: jest.fn(),
  findCommentById: jest.fn(),
  addComment: jest.fn(),
  deleteComment: jest.fn(),
  getTrackComments: jest.fn(),
  getUserTracks: jest.fn(),
  getUserUploadedSeconds: jest.fn(),
  updateBlockedRegions: jest.fn(),
  createTrack: jest.fn(),
  updateTrack: jest.fn(),
  setTrackProcessing: jest.fn(),
  createTrackPlay: jest.fn(),
  addToRecentlyPlayed: jest.fn(),
  deleteOldRecentlyPlayed: jest.fn(),
  getTrackPlaylists: jest.fn(),
  deleteTrack: jest.fn(),
  findTrackByTitleAndArtist: jest.fn(),
  getTrackTopFansIds: jest.fn(),
  findRelatedTracks: jest.fn(),
  findAllTimeStats: jest.fn(),
  getTopListeners: jest.fn(),
  getTopRegions: jest.fn(),
  getTopPlaylistsAndAlbums: jest.fn(),
  getSpotlightTracks: jest.fn(),
  countSpotlight: jest.fn(),
  findSpotlight: jest.fn(),
  addToSpotlight: jest.fn(),
  updateSpotlightTracks: jest.fn(),
  setScheduledAt: jest.fn(),
  scheduleTrackRelease: jest.fn(),
  releaseTrack: jest.fn(),
});

export const mockUserRepository = () => ({
  findById: jest.fn(),
});

export const mockGenreRepository = () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findByNames: jest.fn(),
});

export const mockPlaylistRepository = () => ({
  getTrackPlaylists: jest.fn(),
});

export const mockStorageService = () => ({
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
  downloadToTemp: jest.fn(),
});

export const mockTrackSseService = () => ({
  getStream: jest.fn(),
  emit: jest.fn(),
  complete: jest.fn(),
});

export const mockAudioQueue = () => ({
  add: jest.fn(),
  remove: jest.fn(),
});

export const mockReleaseQueue = () => ({
  add: jest.fn(),
  getJob: jest.fn(),
});

export const mockFansService = () => ({
  getTopFans: jest.fn(),
  getFirstFans: jest.fn(),
  refreshTopFans: jest.fn(),
  triggerFirstFansSnapshot: jest.fn(),
  refreshAllTopFans: jest.fn(),
  snapshotAllPendingFirstFans: jest.fn(),
});

export const mockPlaylistService = () => ({
  getPlaylistById: jest.fn(),
  getTrackPlaylists: jest.fn(),
});

export const mockFfmpegService = () => ({
  getDuration: jest.fn(),
});

export const mockTrackPlay = (overrides?: object) => ({
  trackPlayId: '550e8400-e29b-41d4-a716-446655441111',
  trackId: MOCK_TRACK_ID,
  userId: MOCK_USER_ID,
  playedAt: new Date('2024-06-02T12:00:00Z'),
  durationPlayed: 180,
  playlistId: null,
  ...overrides,
});

export const mockRecentlyPlayedArtistRow = (overrides?: object) => ({
  type: 'artist' as const,
  playedAt: new Date('2024-06-02T12:00:00Z'),
  artist: {
    userId: MOCK_OTHER_USER_ID,
    username: 'dj_nour',
    displayName: 'Nour',
    avatarUrl: 'https://example.com/avatar.jpg',
    followersCount: 500,
  },
  ...overrides,
});

export const mockFanResult = (overrides?: object) => ({
  rank: 1,
  playCount: 42,
  user: {
    userId: MOCK_USER_ID,
    username: 'test_user',
    displayName: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
  },
  ...overrides,
});

export const mockRedisClient = () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  lPush: jest.fn(),
  lTrim: jest.fn(),
  zIncrBy: jest.fn(),
  zRange: jest.fn(),
});

export const mockActivitiesService = () => ({
  createActivity: jest.fn(),
});
