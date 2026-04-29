import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';

const TRACK_EXAMPLE = {
  trackId: '550e8400-e29b-41d4-a716-446655440010',
  title: 'Midnight Vibes',
  coverImage: 'https://cdn.example.com/covers/midnight.jpg',
  audioUrl: 'https://cdn.example.com/audio/midnight.mp3',
  waveformUrl: 'https://cdn.example.com/waveforms/midnight.png',
  durationSeconds: 212,
  playCount: 4200,
  likesCount: 320,
  repostsCount: 45,
  commentsCount: 18,
  mainArtists: ['DJ Nova'],
  createdAt: '2024-06-01T12:00:00Z',
  genre: { genreId: '550e8400-e29b-41d4-a716-446655440099', name: 'Electronic' },
  user: {
    userId: '550e8400-e29b-41d4-a716-446655440001',
    username: 'dj_nova',
    displayName: 'DJ Nova',
    avatarUrl: 'https://cdn.example.com/avatars/dj_nova.jpg',
    followersCount: 12000,
    city: 'Cairo',
    country: 'EG',
  },
  isLiked: false,
  isReposted: false,
};

// ─── Download Track ───────────────────────────────────────────────────────────

export function ApiDownloadTrack() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Download a track for offline listening',
      description:
        "Marks a track as downloaded for the authenticated user. The track must have offline listening enabled, be public, and not be blocked in the user's region. Requires a Pro or Go+ subscription. Simulates a download delay before returning.",
    }),
    ApiParam({ name: 'track_id', description: 'UUID of the track to download', type: 'string' }),
    ApiResponse({
      status: 201,
      description: 'Track downloaded successfully',
      schema: {
        example: {
          status: 'success',
          message: 'Track downloaded successfully',
          downloadId: '550e8400-e29b-41d4-a716-446655440020',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Track not found or already downloaded',
      schema: {
        example: { statusCode: 400, message: 'Track not found' },
      },
    }),
    ApiResponse({
      status: 403,
      description:
        'Track not available for download (offline listening disabled, private, or region-blocked)',
      schema: {
        example: { statusCode: 403, message: 'Track is not available for download' },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({
      status: 403,
      description: 'Subscription plan does not include offline listening',
    })
  );
}

// ─── Delete Downloaded Track ──────────────────────────────────────────────────

export function ApiDeleteDownloadedTrack() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Remove a downloaded track',
      description:
        'Removes the offline copy of a track for the authenticated user. Only removes tracks that were individually downloaded (source = track). Does not affect tracks downloaded as part of a playlist.',
    }),
    ApiParam({
      name: 'track_id',
      description: 'UUID of the downloaded track to remove',
      type: 'string',
    }),
    ApiResponse({
      status: 200,
      description: 'Downloaded track removed successfully',
      schema: {
        example: { status: 'success', message: 'Downloaded track deleted successfully' },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Track was not individually downloaded by this user',
      schema: {
        example: { statusCode: 400, message: 'Track has not been downloaded by this user' },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

// ─── Download Playlist ────────────────────────────────────────────────────────

export function ApiDownloadPlaylist() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Download a playlist for offline listening',
      description:
        'Downloads all eligible tracks in a playlist for offline listening. The playlist must be public. Tracks that are private, have offline listening disabled, or are region-blocked are skipped. Requires a Pro or Go+ subscription.',
    }),
    ApiParam({
      name: 'playlist_id',
      description: 'UUID of the playlist to download',
      type: 'string',
    }),
    ApiResponse({
      status: 201,
      description: 'Playlist downloaded successfully (some tracks may have been skipped)',
      schema: {
        example: {
          status: 'success',
          message: 'Playlist downloaded successfully',
          downloadedTracks: 18,
          downloadedTrackIds: [
            '550e8400-e29b-41d4-a716-446655440010',
            '550e8400-e29b-41d4-a716-446655440011',
          ],
          downloadIds: [
            '550e8400-e29b-41d4-a716-446655440020',
            '550e8400-e29b-41d4-a716-446655440021',
          ],
          skippedTracks: 2,
          skippedTrackIds: ['550e8400-e29b-41d4-a716-446655440012'],
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Playlist not found, empty, or already downloaded',
      schema: {
        example: { statusCode: 400, message: 'Playlist not found' },
      },
    }),
    ApiResponse({
      status: 403,
      description: 'Playlist is private',
      schema: {
        example: { statusCode: 403, message: 'Playlist is private and cannot be downloaded' },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

// ─── Delete Downloaded Playlist ───────────────────────────────────────────────

export function ApiDeleteDownloadedPlaylist() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Remove a downloaded playlist',
      description:
        'Removes the offline copy of a playlist and all its associated downloaded tracks for the authenticated user.',
    }),
    ApiParam({
      name: 'playlist_id',
      description: 'UUID of the downloaded playlist to remove',
      type: 'string',
    }),
    ApiResponse({
      status: 200,
      description: 'Downloaded playlist and its tracks removed successfully',
      schema: {
        example: {
          status: 'success',
          message: 'Downloaded playlist and associated tracks deleted successfully',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Playlist was not downloaded by this user',
      schema: {
        example: { statusCode: 400, message: 'Playlist has not been downloaded by this user' },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

// ─── Get Downloaded List ──────────────────────────────────────────────────────

export function ApiGetDownloadedList() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get all downloaded tracks and playlists',
      description:
        "Returns the authenticated user's offline library: individually downloaded tracks and downloaded playlists (with their downloaded tracks). Tracks include isLiked and isReposted flags. Supports pagination.",
    }),
    ApiQuery({
      name: 'page',
      required: false,
      description: 'Page number (default: 1)',
      type: 'number',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      description: 'Items per page (default: 20)',
      type: 'number',
    }),
    ApiResponse({
      status: 200,
      description: 'Offline library returned successfully',
      schema: {
        example: {
          status: 'success',
          data: {
            tracks: {
              items: [TRACK_EXAMPLE],
              total: 5,
            },
            playlists: {
              items: [
                {
                  playlistId: '550e8400-e29b-41d4-a716-446655440030',
                  title: 'Late Night Sessions',
                  description: 'Chill beats for the night',
                  coverImage: 'https://cdn.example.com/playlists/lns.jpg',
                  tracksCount: 12,
                  durationSeconds: 2880,
                  likesCount: 150,
                  repostsCount: 20,
                  createdAt: '2024-05-15T10:00:00Z',
                  isLiked: true,
                  isReposted: false,
                  user: {
                    userId: '550e8400-e29b-41d4-a716-446655440001',
                    username: 'dj_nova',
                    displayName: 'DJ Nova',
                    avatarUrl: 'https://cdn.example.com/avatars/dj_nova.jpg',
                    city: 'Cairo',
                    country: 'EG',
                    followersCount: 12000,
                  },
                  playlistTracks: [TRACK_EXAMPLE],
                },
              ],
              total: 1,
            },
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}
