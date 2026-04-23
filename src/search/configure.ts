import { Logger } from '@nestjs/common';
import { getIndex } from './client';

export async function configureMeilisearch(): Promise<void> {
  const index = getIndex();

  await index.updateSettings({
    searchableAttributes: [
      'title', // highest priority
      'artist_name',
      'username',
      'display_name',
      'tags',
      'genre',
      'description', // lowest priority
    ],

    filterableAttributes: ['type', 'city', 'tags', 'genre', 'duration', 'created_at'],

    displayedAttributes: [
      'id',
      'type',
      // autocomplete display fields
      'title',
      'artist_name',
      'username',
      'display_name',
      'genre',
      'tags',
    ],

    typoTolerance: {
      enabled: true,
      minWordSizeForTypos: {
        oneTypo: 4,
        twoTypos: 8,
      },
    },

    rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],

    stopWords: ['the', 'a', 'an', 'of', 'in'],
  });

  Logger.log('Meilisearch configured successfully');
}
