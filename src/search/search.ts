import { getIndex } from './client';
import { SearchParams, SearchResult } from './types';

// Returns ordered IDs — caller fetches live data from DB
export async function search(params: SearchParams): Promise<SearchResult[]> {
  const {
    query,
    type,
    genre,
    tags,
    city,
    durationRange,
    createdAtRange,
    limit = 20,
    offset = 0,
  } = params;
  const index = getIndex();

  const filters: string[] = [];

  if (type && type !== 'all') filters.push(`type = "${type}"`);
  if (genre) filters.push(`genre = "${genre}"`);
  if (city) filters.push(`city = "${city}"`);
  if (tags?.length) {
    filters.push(`tags IN [${tags.map((t) => `"${t}"`).join(', ')}]`);
  }
  if (durationRange) {
    const [min, max] = [durationRange.min, durationRange.max].map(Number);
    if (!Number.isNaN(min)) filters.push(`duration >= ${min}`);
    if (!Number.isNaN(max)) filters.push(`duration <= ${max}`);
  }
  if (createdAtRange) {
    const from = createdAtRange.from ? new Date(createdAtRange.from).toISOString() : null;
    const to = createdAtRange.to ? new Date(createdAtRange.to).toISOString() : null;
    if (from) filters.push(`created_at >= ${from}`);
    if (to) filters.push(`created_at <= ${to}`);
  }

  const results = await index.search(query, {
    filter: filters.length ? filters.join(' AND ') : undefined,
    limit,
    offset,
    attributesToRetrieve: ['id', 'type'],
  });

  return results.hits as SearchResult[];
}

// export async function wordAutocomplete(query: string): Promise<string[]> {
//   const index = getIndex()

//   const results = await index.search(query, {
//     limit: 10,
//     attributesToRetrieve: ['title', 'username', 'display_name'],
//   })

//   const suggestions = results.hits
//   .flatMap((hit) => [
//     hit.title,
//     hit.username,
//     hit.display_name,
//   ])
//   .filter((s): s is string => !!s)
//   .map((s) => s.toLowerCase().trim())
//   .filter((s, i, arr) => arr.indexOf(s) === i)
//   .slice(0, 8)

//   return suggestions
// }
