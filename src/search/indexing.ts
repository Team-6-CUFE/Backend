import { Playlist } from '../playlist/entities/playlist.entity';
import { Track } from '../track/entities/track.entity';
import { User } from '../user/entities/user.entity';
import { getIndex } from './client';
import {
  SearchDocument,
  TrackDocument,
  UserDocument,
  PlaylistDocument,
  AlbumDocument,
} from './types';

// --- Mappers (from DB model to search document) ---

export function mapTrack(track: Track): TrackDocument {
  return {
    id: `track_${track.trackId}`,
    type: 'track',
    title: track.title,
    artist_name: track.user.displayName,
    description: track.description,
    tags: track.tags?.map((t) => t.name),
    genre: track.genre?.name,
    duration: track.durationSeconds,
    created_at: track.createdAt,
  };
}

export function mapUser(user: User): UserDocument {
  return {
    id: `user_${user.userId}`,
    type: 'user',
    username: user.username,
    display_name: user.displayName,
    city: user.city,
    avatar_url: user.avatarUrl,
  };
}

export function mapPlaylist(playlist: Playlist): PlaylistDocument {
  return {
    id: `playlist_${playlist.playlistId}`,
    type: 'playlist',
    title: playlist.title,
    artist_name: playlist.user.displayName,
    tags: playlist.tags?.map((t) => t.name),
    genre: playlist.genre?.name,
  };
}

export function mapAlbum(album: Playlist): AlbumDocument {
  return {
    id: `album_${album.playlistId}`,
    type: 'album',
    title: album.title,
    artist_name: album.user.displayName,
    tags: album.tags?.map((t) => t.name),
    genre: album.genre?.name,
  };
}

// --- Index operations ---

export async function addDocuments(documents: SearchDocument[]): Promise<void> {
  const index = getIndex();
  await index.addDocuments(documents);
}

export async function updateDocument(document: SearchDocument): Promise<void> {
  const index = getIndex();
  await index.updateDocuments([document]);
}

export async function deleteDocument(id: string): Promise<void> {
  const index = getIndex();
  await index.deleteDocument(id);
}
