import 'dotenv/config';
import { getIndex } from './client';

async function clearCatalog() {
  try {
    console.log('--- Meilisearch Cleanup ---');
    const index = getIndex();
    await index.deleteAllDocuments();
    console.log('Success: Catalog index cleared.');
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error clearing Meilisearch:', error.message);
    } else {
      console.error('Error clearing Meilisearch:', error);
    }
    process.exit(1);
  }
}

clearCatalog();
