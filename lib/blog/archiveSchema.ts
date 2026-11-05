import { cache } from 'react';
import { createServiceClient } from '@/lib/db/server';
import {
  assembleGraph,
  buildBreadcrumbEntity,
  buildIds,
  buildItemListEntity,
  buildPageEntity,
  buildWebSiteEntity,
  type SchemaEntity,
} from '@/lib/schemaBuilder';
import { buildLocalBusinessEntity, type BusinessInfo } from '@/lib/businessSchema';
import { postHref, type ArchivePost } from './listing';

const BUSINESS_INFO_ID = '00000000-0000-0000-0000-000000000002';

export const getBusinessInfo = cache(async (): Promise<BusinessInfo | null> => {
  try {
    const { data } = await createServiceClient()
      .from('business_info')
      .select('*')
      .eq('id', BUSINESS_INFO_ID)
      .maybeSingle();
    return (data as BusinessInfo | null) || null;
  } catch {
    return null;
  }
});

// One linked JSON-LD graph for an archive page: website, organisation, the
// collection (or profile) page, its list of posts and the breadcrumb trail.
export function buildArchiveGraph(input: {
  siteUrl: string;
  pageUrl: string;
  name: string;
  description?: string | null;
  business: BusinessInfo | null;
  breadcrumbs: { name: string; url: string }[];
  posts: ArchivePost[];
  pageType?: 'CollectionPage' | 'ProfilePage';
  // Extra entities (e.g. the Person on an author page).
  extra?: SchemaEntity[];
  mainEntityId?: string;
}): object {
  const { siteUrl, pageUrl } = input;
  const ids = buildIds(siteUrl, pageUrl);
  const listId = `${pageUrl}#itemlist`;
  return assembleGraph([
    buildWebSiteEntity({
      id: ids.website,
      url: siteUrl,
      name: input.business?.business_name || 'MedicalAccountant.ie',
      publisherId: ids.organization,
    }),
    buildLocalBusinessEntity(input.business, siteUrl, ids.organization, {
    }),
    buildPageEntity({
      type: input.pageType || 'CollectionPage',
      id: ids.webPage,
      url: pageUrl,
      name: input.name,
      description: input.description,
      isPartOfId: ids.website,
      breadcrumbId: ids.breadcrumb,
      mainEntityListId: !input.mainEntityId && input.posts.length > 0 ? listId : undefined,
      mainEntityId: input.mainEntityId,
    }),
    ...(input.extra || []),
    ...(input.posts.length > 0
      ? [buildItemListEntity({
          id: listId,
          name: input.name,
          items: input.posts.map((p) => ({
            name: p.title,
            url: `${siteUrl}${postHref(p)}`,
            image: p.featured_image_url,
          })),
        })]
      : []),
    buildBreadcrumbEntity(ids.breadcrumb, input.breadcrumbs),
  ]);
}
