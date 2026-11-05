import { cache } from 'react';
import { createServiceClient } from '@/lib/db/server';
import { DEFAULT_POST_URL_STRUCTURE, normaliseStructure, type PostUrlStructure } from './postUrl';

// The admin's URL choice, read once per request. Falls back to the default if
// the database cannot be read (for example during `next build`).
export const getPostUrlStructure = cache(async (): Promise<PostUrlStructure> => {
  try {
    const { data } = await createServiceClient()
      .from('site_settings')
      .select('post_url_structure')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .maybeSingle();
    return normaliseStructure(data?.post_url_structure);
  } catch {
    return DEFAULT_POST_URL_STRUCTURE;
  }
});
