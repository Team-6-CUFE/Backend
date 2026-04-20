import { getIndex } from './client';
import {
  SearchDocument,
  TrackDocument,
  UserDocument,
  PlaylistDocument,
  AlbumDocument,
} from './types';

// --- Mappers (from DB model to search document) ---

export function mapTrack(track: {
  id: string;
  title: string;
  artistName: string;
  description?: string;
  tags: string[];
  genre: string;
  durationSeconds: number;
  createdAt: Date;
}): TrackDocument {
  return {
    id: `track_${track.id}`,
    type: 'track',
    title: track.title,
    artist_name: track.artistName,
    description: track.description,
    tags: track.tags,
    genre: track.genre,
    duration: track.durationSeconds,
    created_at: track.createdAt,
  };
}

export function mapUser(user: {
  id: string;
  username: string;
  displayName: string;
  city?: string;
  avatarUrl?: string;
}): UserDocument {
  return {
    id: `user_${user.id}`,
    type: 'user',
    username: user.username,
    display_name: user.displayName,
    city: user.city,
    avatar_url: user.avatarUrl,
  };
}

export function mapPlaylist(playlist: {
  id: string;
  title: string;
  artistName: string;
  tags: string[];
  genre: string;
  trackCount: number;
}): PlaylistDocument {
  return {
    id: `playlist_${playlist.id}`,
    type: 'playlist',
    title: playlist.title,
    artist_name: playlist.artistName,
    tags: playlist.tags,
    genre: playlist.genre,
  };
}

export function mapAlbum(album: {
  id: string;
  title: string;
  artistName: string;
  tags: string[];
  genre: string;
}): AlbumDocument {
  return {
    id: `album_${album.id}`,
    type: 'album',
    title: album.title,
    artist_name: album.artistName,
    tags: album.tags,
    genre: album.genre,
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
