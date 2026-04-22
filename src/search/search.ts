import { getIndex } from './client';
import { AutocompleteHit, SearchParams, SearchResult } from './types';

export interface SearchResponse {
  hits: SearchResult[];
  total: number;
}

// Returns ordered IDs and total count — caller fetches live data from DB
export async function search(params: SearchParams): Promise<SearchResponse> {
  const {
    query,
    type,
    genre,
    tag,
    city,
    durationRange,
    createdAtLimit,
    limit = 20,
    offset = 0,
  } = params;
  const index = getIndex();

  const filters: string[] = [];

  if (type && type !== 'all') filters.push(`type = "${type}"`);
  if (genre) filters.push(`genre = "${genre}"`);
  if (city) filters.push(`city = "${city}"`);
  if (tag) filters.push(`tag = "${tag}"`);

  if (durationRange) {
    const [min, max] = [durationRange.min, durationRange.max].map(Number);
    if (!Number.isNaN(min)) filters.push(`duration >= ${min}`);
    if (!Number.isNaN(max)) filters.push(`duration <= ${max}`);
  }
  if (createdAtLimit) {
    const createdAtLimitString = new Date(createdAtLimit).toISOString();
    filters.push(`created_at >= ${createdAtLimitString}`);
  }

  const results = await index.search(query, {
    filter: filters.length ? filters.join(' AND ') : undefined,
    limit,
    offset,
    attributesToRetrieve: ['id', 'type'],
  });

  return {
    hits: results.hits as SearchResult[],
    total: (results as any).estimatedTotalHits ?? (results as any).nbHits ?? results.hits.length,
  };
}

export async function autocomplete(query: string): Promise<string[]> {
  const index = getIndex();

  const results = await index.search(query, {
    limit: 10,
    attributesToRetrieve: ['title', 'username', 'display_name'],
  });
  const hits = results.hits as AutocompleteHit[];
  const suggestions = hits
    .flatMap((hit) => [hit.title, hit.username, hit.display_name])
    .filter((s): s is string => !!s)
    .map((s) => s.toLowerCase().trim())
    .filter((s, i, arr) => arr.indexOf(s) === i)
    .slice(0, 8);
  return suggestions;
}
