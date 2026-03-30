import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiCookieAuth, ApiParam } from '@nestjs/swagger';

export function ApiRepostPlaylist() {
  return applyDecorators(
    ApiOperation({ summary: 'Repost a playlist' }),
    ApiParam({ name: 'playlistId', type: Number, description: 'ID of the playlist to repost' }),
    ApiResponse({ status: 201, description: 'Playlist reposted successfully' }),
    ApiResponse({
      status: 400,
      description: 'Bad Request - Invalid playlist ID or user not authenticated',
    }),
    ApiCookieAuth('access_token')
  );
}
export function ApiUnrepostPlaylist() {
  return applyDecorators(
    ApiOperation({ summary: 'Repost a playlist' }),
    ApiParam({ name: 'playlistId', type: Number, description: 'ID of the playlist to repost' }),
    ApiResponse({ status: 201, description: 'Playlist reposted successfully' }),
    ApiResponse({
      status: 400,
      description: 'Bad Request - Invalid playlist ID or user not authenticated',
    }),
    ApiCookieAuth('access_token')
  );
}

export function ApiGetPlaylistRepostCount() {
  return applyDecorators(
    ApiOperation({ summary: 'Repost a playlist' }),
    ApiParam({ name: 'playlistId', type: Number, description: 'ID of the playlist to repost' }),
    ApiResponse({ status: 201, description: 'Playlist reposted successfully' }),
    ApiResponse({
      status: 400,
      description: 'Bad Request - Invalid playlist ID or user not authenticated',
    }),
    ApiCookieAuth('access_token')
  );
}

export function ApiGetPlaylistReposts() {
  return applyDecorators(
    ApiOperation({ summary: 'Repost a playlist' }),
    ApiParam({ name: 'playlistId', type: Number, description: 'ID of the playlist to repost' }),
    ApiResponse({ status: 201, description: 'Playlist reposted successfully' }),
    ApiResponse({
      status: 400,
      description: 'Bad Request - Invalid playlist ID or user not authenticated',
    }),
    ApiCookieAuth('access_token')
  );
}
