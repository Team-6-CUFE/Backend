import { Meilisearch, Index } from 'meilisearch';
import { SearchDocument } from './types';

const client = new Meilisearch({
  host: process.env.MEILI_HOST ?? 'http://localhost:7700',
  apiKey: process.env.MEILI_API_KEY,
});

export const getIndex = (): Index<SearchDocument> => client.index<SearchDocument>('catalog');
