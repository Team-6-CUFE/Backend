import { getIndex } from './client';
import { search, autocomplete } from './search';
import {
  mapTrack,
  mapUser,
  mapPlaylist,
  mapAlbum,
  addDocuments,
  updateDocument,
  deleteDocument,
} from './indexing';

// ─── Mock client ─────────────────────────────────────────────────────────────

jest.mock('./client', () => ({ getIndex: jest.fn() }));

const mockIndex = {
  search: jest.fn(),
  addDocuments: jest.fn(),
  updateDocuments: jest.fn(),
  deleteDocument: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (getIndex as jest.Mock).mockReturnValue(mockIndex);
});

// ─── search.ts ───────────────────────────────────────────────────────────────

describe('search()', () => {
  const baseHits = [{ id: 'track_1', type: 'track' }];

  const mockSearchResult = (overrides?: object) => ({
    hits: baseHits,
    estimatedTotalHits: 42,
    ...overrides,
  });

  it('should call index.search with filter: undefined when no filters are passed', async () => {
    mockIndex.search.mockResolvedValue(mockSearchResult());

    await search({ query: 'hello' });

    expect(mockIndex.search).toHaveBeenCalledWith(
      'hello',
      expect.objectContaining({ filter: undefined })
    );
  });

  it('should include type filter when type is not "all"', async () => {
    mockIndex.search.mockResolvedValue(mockSearchResult());

    await search({ query: 'song', type: 'track' });

    const [, options] = mockIndex.search.mock.calls[0];
    expect(options.filter).toContain('type = "track"');
  });

  it('should NOT include type filter when type is "all"', async () => {
    mockIndex.search.mockResolvedValue(mockSearchResult());

    await search({ query: 'song', type: 'all' });

    const [, options] = mockIndex.search.mock.calls[0];
    expect(options.filter ?? '').not.toContain('type');
  });

  it('should include city filter when city is provided', async () => {
    mockIndex.search.mockResolvedValue(mockSearchResult());

    await search({ query: 'artist', city: 'Cairo' });

    const [, options] = mockIndex.search.mock.calls[0];
    expect(options.filter).toContain('city = "Cairo"');
  });

  it('should include duration >= filter when durationRange.min is provided', async () => {
    mockIndex.search.mockResolvedValue(mockSearchResult());

    await search({ query: 'track', durationRange: { min: 120 } });

    const [, options] = mockIndex.search.mock.calls[0];
    expect(options.filter).toContain('duration >= 120');
  });

  it('should include duration <= filter when durationRange.max is provided', async () => {
    mockIndex.search.mockResolvedValue(mockSearchResult());

    await search({ query: 'track', durationRange: { max: 300 } });

    const [, options] = mockIndex.search.mock.calls[0];
    expect(options.filter).toContain('duration <= 300');
  });

  it('should include both duration filters when both min and max are provided', async () => {
    mockIndex.search.mockResolvedValue(mockSearchResult());

    await search({ query: 'track', durationRange: { min: 60, max: 240 } });

    const [, options] = mockIndex.search.mock.calls[0];
    expect(options.filter).toContain('duration >= 60');
    expect(options.filter).toContain('duration <= 240');
  });

  it('should include createdAt filter when createdAtLimit is provided', async () => {
    mockIndex.search.mockResolvedValue(mockSearchResult());
    const limit = new Date('2024-01-01T00:00:00.000Z');

    await search({ query: 'track', createdAtLimit: limit });

    const [, options] = mockIndex.search.mock.calls[0];
    expect(options.filter).toContain('created_at >= "2024-01-01T00:00:00.000Z"');
  });

  it('should combine genre and tag with OR in the filter string', async () => {
    mockIndex.search.mockResolvedValue(mockSearchResult());

    await search({ query: 'music', genre: 'pop', tag: 'summer' });

    const [, options] = mockIndex.search.mock.calls[0];
    expect(options.filter).toContain('genre = "pop"');
    expect(options.filter).toContain('tags = "summer"');
    expect(options.filter).toContain('OR');
  });

  it('should return hits and total from estimatedTotalHits', async () => {
    mockIndex.search.mockResolvedValue(mockSearchResult({ estimatedTotalHits: 99 }));

    const result = await search({ query: 'test' });

    expect(result.hits).toBe(baseHits);
    expect(result.total).toBe(99);
  });

  it('should fall back to hits.length when estimatedTotalHits and nbHits are absent', async () => {
    mockIndex.search.mockResolvedValue({ hits: baseHits });

    const result = await search({ query: 'test' });

    expect(result.total).toBe(baseHits.length);
  });

  it('should pass limit and offset to index.search', async () => {
    mockIndex.search.mockResolvedValue(mockSearchResult());

    await search({ query: 'test', limit: 5, offset: 15 });

    const [, options] = mockIndex.search.mock.calls[0];
    expect(options.limit).toBe(5);
    expect(options.offset).toBe(15);
  });
});

// ─── autocomplete ─────────────────────────────────────────────────────────────

describe('autocomplete()', () => {
  it('should return lowercased, deduplicated suggestions matching the query', async () => {
    mockIndex.search.mockResolvedValue({
      hits: [
        { title: 'Summer Vibes', username: 'djsummer', display_name: 'DJ Summer' },
        { title: 'Summertime', username: 'artist2', display_name: 'Artist Two' },
      ],
    });

    const result = await autocomplete('summer');

    expect(result).toEqual(
      expect.arrayContaining(['summer vibes', 'djsummer', 'dj summer', 'summertime'])
    );
    // All lowercase
    result.forEach((s) => expect(s).toBe(s.toLowerCase()));
    // Deduplicated
    expect(result.length).toBe(new Set(result).size);
  });

  it('should only include strings that contain the query', async () => {
    mockIndex.search.mockResolvedValue({
      hits: [
        { title: 'Rock Anthem', username: 'rocker', display_name: 'The Rocker' },
        { title: 'Pop Song', username: 'pop_star', display_name: 'Pop Star' },
      ],
    });

    const result = await autocomplete('rock');

    expect(result.every((s) => s.includes('rock'))).toBe(true);
    expect(result).not.toContain('pop song');
  });

  it('should return an empty array when no hits match', async () => {
    mockIndex.search.mockResolvedValue({ hits: [] });

    const result = await autocomplete('xyz_no_match');

    expect(result).toEqual([]);
  });

  it('should return at most 8 suggestions', async () => {
    const hits = Array.from({ length: 20 }, (_, i) => ({
      title: `Test Track ${i}`,
      username: `user${i}`,
      display_name: `User ${i}`,
    }));
    mockIndex.search.mockResolvedValue({ hits });

    const result = await autocomplete('test');

    expect(result.length).toBeLessThanOrEqual(8);
  });

  it('should deduplicate suggestions', async () => {
    mockIndex.search.mockResolvedValue({
      hits: [{ title: 'Jazz Night', username: 'Jazz Night', display_name: 'Jazz Night' }],
    });

    const result = await autocomplete('jazz');

    expect(result).toEqual(['jazz night']);
    expect(result.length).toBe(1);
  });
});

// ─── indexing.ts — mapper functions ──────────────────────────────────────────

describe('mapTrack()', () => {
  it('should map a Track entity to a TrackDocument correctly', () => {
    const track = {
      trackId: 'abc-123',
      title: 'My Track',
      description: 'A cool track',
      tags: [{ name: 'chill' }, { name: 'lo-fi' }],
      genre: { name: 'Hip-Hop' },
      durationSeconds: 200,
      createdAt: new Date('2024-03-01'),
      user: { displayName: 'DJ Artist' },
    } as any;

    const doc = mapTrack(track);

    expect(doc.id).toBe('track_abc-123');
    expect(doc.type).toBe('track');
    expect(doc.title).toBe('My Track');
    expect(doc.artist_name).toBe('DJ Artist');
    expect(doc.description).toBe('A cool track');
    expect(doc.tags).toEqual(['chill', 'lo-fi']);
    expect(doc.genre).toBe('Hip-Hop');
    expect(doc.duration).toBe(200);
    expect(doc.created_at).toEqual(new Date('2024-03-01'));
  });

  it('should handle missing tags gracefully', () => {
    const track = {
      trackId: 'abc-123',
      title: 'No Tags',
      tags: undefined,
      genre: undefined,
      durationSeconds: 100,
      createdAt: new Date(),
      user: { displayName: 'Artist' },
    } as any;

    const doc = mapTrack(track);

    expect(doc.tags).toBeUndefined();
    expect(doc.genre).toBeUndefined();
  });
});

describe('mapUser()', () => {
  it('should map a User entity to a UserDocument correctly', () => {
    const user = {
      userId: 'user-456',
      username: 'alice',
      displayName: 'Alice Smith',
      city: 'Cairo',
      avatarUrl: 'https://example.com/avatar.jpg',
    } as any;

    const doc = mapUser(user);

    expect(doc.id).toBe('user_user-456');
    expect(doc.type).toBe('user');
    expect(doc.username).toBe('alice');
    expect(doc.display_name).toBe('Alice Smith');
    expect(doc.city).toBe('Cairo');
    expect(doc.avatar_url).toBe('https://example.com/avatar.jpg');
  });
});

describe('mapPlaylist()', () => {
  it('should map a Playlist entity to a PlaylistDocument correctly', () => {
    const playlist = {
      playlistId: 'pl-789',
      title: 'My Playlist',
      tags: [{ name: 'pop' }],
      genre: { name: 'Pop' },
      user: { displayName: 'Curator' },
    } as any;

    const doc = mapPlaylist(playlist);

    expect(doc.id).toBe('playlist_pl-789');
    expect(doc.type).toBe('playlist');
    expect(doc.title).toBe('My Playlist');
    expect(doc.artist_name).toBe('Curator');
    expect(doc.tags).toEqual(['pop']);
    expect(doc.genre).toBe('Pop');
  });
});

describe('mapAlbum()', () => {
  it('should map a Playlist entity to an AlbumDocument correctly', () => {
    const album = {
      playlistId: 'alb-101',
      title: 'My Album',
      tags: [{ name: 'jazz' }],
      genre: { name: 'Jazz' },
      user: { displayName: 'Band Name' },
    } as any;

    const doc = mapAlbum(album);

    expect(doc.id).toBe('album_alb-101');
    expect(doc.type).toBe('album');
    expect(doc.title).toBe('My Album');
    expect(doc.artist_name).toBe('Band Name');
    expect(doc.tags).toEqual(['jazz']);
    expect(doc.genre).toBe('Jazz');
  });
});

// ─── indexing.ts — index operations ──────────────────────────────────────────

describe('addDocuments()', () => {
  it('should call index.addDocuments with the provided docs array', async () => {
    mockIndex.addDocuments.mockResolvedValue({ taskUid: 1 });

    const docs = [
      {
        id: 'track_1',
        type: 'track' as const,
        title: 'A',
        artist_name: 'B',
        tags: [],
        genre: 'C',
        duration: 100,
        created_at: new Date(),
      },
    ];

    await addDocuments(docs);

    expect(mockIndex.addDocuments).toHaveBeenCalledWith(docs);
  });
});

describe('updateDocument()', () => {
  it('should call index.updateDocuments with the document wrapped in an array', async () => {
    mockIndex.updateDocuments.mockResolvedValue({ taskUid: 2 });

    const doc = { id: 'user_1', type: 'user' as const, username: 'bob', display_name: 'Bob' };

    await updateDocument(doc);

    expect(mockIndex.updateDocuments).toHaveBeenCalledWith([doc]);
  });
});

describe('deleteDocument()', () => {
  it('should call index.deleteDocument with the provided id', async () => {
    mockIndex.deleteDocument.mockResolvedValue({ taskUid: 3 });

    await deleteDocument('track_abc-123');

    expect(mockIndex.deleteDocument).toHaveBeenCalledWith('track_abc-123');
  });
});
