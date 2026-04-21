export type EntityType = 'track' | 'user' | 'playlist' | 'album';

export interface BaseDocument {
  id: string;
  type: EntityType;
}

export interface TrackDocument extends BaseDocument {
  type: 'track';
  title: string;
  artist_name: string;
  description?: string;
  tags: string[];
  genre: string;
  duration: number;
  created_at: Date;
}

export interface UserDocument extends BaseDocument {
  type: 'user';
  username: string;
  display_name: string;
  city?: string;
  avatar_url?: string;
}

export interface PlaylistDocument extends BaseDocument {
  type: 'playlist';
  title: string;
  artist_name: string;
  tags: string[];
  genre?: string;
}

export interface AlbumDocument extends BaseDocument {
  type: 'album';
  title: string;
  artist_name: string;
  tags: string[];
  genre?: string;
}

export type SearchDocument =
  | TrackDocument
  | UserDocument
  | PlaylistDocument
  | AlbumDocument
  | AutocompleteHit;

export interface SearchParams {
  query: string;
  type?: EntityType | 'all';
  genre?: string;
  tag?: string;
  city?: string;
  durationRange?: {
    min?: number;
    max?: number;
  };
  createdAtLimit?: Date;
  limit?: number;
  offset?: number;
}

export interface AutocompleteParams {
  query: string;
  type: 'all';
}

export interface AutocompleteHit {
  title: string;
  display_name: string;
  username: string;
}

export interface SearchResult {
  id: string;
  type: EntityType;
}
