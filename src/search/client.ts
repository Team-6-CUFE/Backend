import { Meilisearch, Index } from 'meilisearch';
import { SearchDocument } from './types';

let client: Meilisearch | null = null;

const getClient = (): Meilisearch => {
  if (!client) {
    const meiliKey = process.env.MEILI_KEY;
    if (!meiliKey) throw new Error('MEILI_KEY environment variable is not set');

    client = new Meilisearch({
      host: process.env.MEILI_HOST ?? 'http://localhost:7700',
      apiKey: meiliKey,
    });
  }
  return client;
};

export const getIndex = (): Index<SearchDocument> => getClient().index<SearchDocument>('catalog');
