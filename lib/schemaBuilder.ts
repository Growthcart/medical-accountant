interface PostSchemaInput {
  title: string;
  excerpt: string | null;
  content: string | null;
  slug: string;
  category_slug?: string | null;
  published_at: string;
  updated_at: string;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  author_name: string | null;
  category_name: string | null;
  schema_type?: string | null;
  publisher_name?: string;
  publisher_logo?: string | null;
}

export function generatePostSchema(post: PostSchemaInput, siteUrl: string, structure: PostUrlStructure): object {
  const schemaType = post.schema_type || 'BlogPosting';
  const postUrl = `${siteUrl}${postPath(post.slug, post.category_slug, structure)}`;
  const publisherName = post.publisher_name || 'MedicalAccountant.ie';

  const publisher: Record<string, unknown> = {
    '@type': 'Organization',
    name: publisherName,
    url: siteUrl,
  };
  if (post.publisher_logo) publisher.logo = post.publisher_logo;

  // Base schema shared by article-like types
  const baseArticleSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    headline: post.title,
    description: post.excerpt || '',
    datePublished: post.published_at,
    dateModified: post.updated_at,
    inLanguage: 'en-IE',
    url: postUrl,
    mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
    author: { '@type': 'Person', name: post.author_name || 'Admin' },
    publisher,
  };
  if (post.featured_image_url) baseArticleSchema.image = post.featured_image_url;
  if (post.category_name) baseArticleSchema.articleSection = post.category_name;

  switch (schemaType) {
    case 'BlogPosting':
    case 'Article':
    case 'NewsArticle':
      return baseArticleSchema;

    case 'WebPage':
      return {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: post.title,
        description: post.excerpt || '',
        url: postUrl,
        datePublished: post.published_at,
        dateModified: post.updated_at,
        ...(post.featured_image_url && { image: post.featured_image_url }),
      };

    case 'VideoObject':
      return {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: post.title,
        description: post.excerpt || '',
        uploadDate: post.published_at,
        ...(post.featured_image_url && { thumbnailUrl: post.featured_image_url }),
        url: postUrl,
      };

    case 'JobPosting':
      return {
        '@context': 'https://schema.org',
        '@type': 'JobPosting',
        title: post.title,
        description: post.excerpt || post.content || '',
        datePosted: post.published_at,
        url: postUrl,
        hiringOrganization: publisher,
      };

    case 'FAQPage':
      return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        name: post.title,
        description: post.excerpt || '',
        url: postUrl,
        datePublished: post.published_at,
        dateModified: post.updated_at,
        mainEntity: [],
      };

    case 'HowTo':
      return {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: post.title,
        description: post.excerpt || '',
        url: postUrl,
        datePublished: post.published_at,
        dateModified: post.updated_at,
        ...(post.featured_image_url && { image: post.featured_image_url }),
        step: [],
      };

    case 'Product':
      return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: post.title,
        description: post.excerpt || '',
        url: postUrl,
        ...(post.featured_image_url && { image: post.featured_image_url }),
      };

    case 'Event':
      return {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: post.title,
        description: post.excerpt || '',
        url: postUrl,
        ...(post.featured_image_url && { image: post.featured_image_url }),
        startDate: post.published_at,
      };

    default:
      return baseArticleSchema;
  }
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

export function generateBreadcrumbSchema(items: BreadcrumbItem[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// Convenience helper for blog routes: always prepends [Home, Blog] before
// the supplied trail. Used by /news, /news/category/[slug], /news/tag/[slug],
// and the post detail route to keep breadcrumb structure consistent and
// avoid drift between pages.
export function generateBlogBreadcrumbSchema(
  siteUrl: string,
  trail: BreadcrumbItem[],
): object {
  return generateBreadcrumbSchema([
    { name: 'Home', url: siteUrl },
    { name: 'News', url: `${siteUrl}/news` },
    ...trail,
  ]);
}

// ────────────────────────────────────────────────────────────────────────
// Graph-form schema builders
//
// These return entity objects WITHOUT `@context` — meant to be collected
// into a single `@graph` array per page via assembleGraph(). Pattern is
// the one Joost de Valk advocates (joost.blog/seo-graph): stable @id URLs
// link entities so search engines + AI agents can walk relationships
// instead of inferring them from disconnected flat blocks.
// ────────────────────────────────────────────────────────────────────────

import { authorSlug, type AuthorMeta } from './authors';
import { postPath, type PostUrlStructure } from '@/lib/blog/postUrl';

export type SchemaEntity = Record<string, unknown>;

export interface GraphIds {
  website: string;
  organization: string;
  webPage: string;
  primaryImage: string;
  breadcrumb: string;
  article: string;
  person: (fullName: string) => string;
}

export function buildIds(siteUrl: string, pageUrl: string): GraphIds {
  return {
    website: `${siteUrl}/#website`,
    organization: `${siteUrl}/#organization`,
    webPage: `${pageUrl}#webpage`,
    primaryImage: `${pageUrl}#primaryimage`,
    breadcrumb: `${pageUrl}#breadcrumb`,
    article: `${pageUrl}#article`,
    person: (fullName) => `${siteUrl}/#person-${authorSlug(fullName)}`,
  };
}

export interface WebSiteEntityInput {
  id: string;
  url: string;
  name: string;
  description?: string | null;
  inLanguage?: string;
  publisherId: string;
}

export function buildWebSiteEntity(input: WebSiteEntityInput): SchemaEntity {
  return {
    '@type': 'WebSite',
    '@id': input.id,
    url: input.url,
    name: input.name,
    inLanguage: input.inLanguage || 'en-IE',
    publisher: { '@id': input.publisherId },
    ...(input.description && { description: input.description }),
  };
}

export interface WebPageEntityInput {
  id: string;
  url: string;
  name: string;
  description?: string | null;
  inLanguage?: string;
  isPartOfId: string;
  breadcrumbId?: string;
  primaryImageId?: string;
  datePublished?: string | null;
  dateModified?: string | null;
}

export function buildWebPageEntity(input: WebPageEntityInput): SchemaEntity {
  const entity: SchemaEntity = {
    '@type': 'WebPage',
    '@id': input.id,
    url: input.url,
    name: input.name,
    inLanguage: input.inLanguage || 'en-IE',
    isPartOf: { '@id': input.isPartOfId },
  };
  if (input.description) entity.description = input.description;
  if (input.breadcrumbId) entity.breadcrumb = { '@id': input.breadcrumbId };
  if (input.primaryImageId) entity.primaryImageOfPage = { '@id': input.primaryImageId };
  if (input.datePublished) entity.datePublished = input.datePublished;
  if (input.dateModified) entity.dateModified = input.dateModified;
  return entity;
}

export interface PersonEntityInput {
  id: string;
  name: string;
  /** Fallback when AuthorMeta.description is absent. */
  bio?: string | null;
  imageUrl?: string | null;
  meta?: AuthorMeta | null;
  worksForId?: string;
  /** Author page URL; defaults to the @id. */
  url?: string;
}

export function buildPersonEntity(input: PersonEntityInput): SchemaEntity {
  const description = input.meta?.description ?? input.bio ?? undefined;
  const entity: SchemaEntity = {
    '@type': 'Person',
    '@id': input.id,
    name: input.name,
    url: input.url || input.id,
  };
  if (description) entity.description = description;
  if (input.imageUrl) entity.image = input.imageUrl;
  if (input.meta?.jobTitle) entity.jobTitle = input.meta.jobTitle;
  if (input.meta?.sameAs && input.meta.sameAs.length > 0) entity.sameAs = input.meta.sameAs;
  if (input.meta?.knowsAbout && input.meta.knowsAbout.length > 0) entity.knowsAbout = input.meta.knowsAbout;
  if (input.worksForId) entity.worksFor = { '@id': input.worksForId };
  return entity;
}

export interface ImageEntityInput {
  id: string;
  url: string;
  alt?: string | null;
  width?: number;
  height?: number;
}

export function buildImageEntity(input: ImageEntityInput): SchemaEntity {
  return {
    '@type': 'ImageObject',
    '@id': input.id,
    url: input.url,
    contentUrl: input.url,
    inLanguage: 'en-IE',
    ...(input.alt && { caption: input.alt }),
    ...(input.width && { width: input.width }),
    ...(input.height && { height: input.height }),
  };
}

export interface ArticleEntityInput {
  id: string;
  type?: string;
  url: string;
  headline: string;
  description: string;
  datePublished: string;
  dateModified: string;
  inLanguage?: string;
  authorId: string;
  publisherId: string;
  mainEntityOfPageId: string;
  imageId?: string;
  articleSection?: string | null;
  keywords?: string[];
}

export function buildArticleEntity(input: ArticleEntityInput): SchemaEntity {
  const entity: SchemaEntity = {
    '@type': input.type || 'BlogPosting',
    '@id': input.id,
    url: input.url,
    headline: input.headline,
    description: input.description,
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    inLanguage: input.inLanguage || 'en-IE',
    author: { '@id': input.authorId },
    publisher: { '@id': input.publisherId },
    mainEntityOfPage: { '@id': input.mainEntityOfPageId },
  };
  if (input.imageId) entity.image = { '@id': input.imageId };
  if (input.articleSection) entity.articleSection = input.articleSection;
  if (input.keywords && input.keywords.length > 0) entity.keywords = input.keywords;
  return entity;
}

export function buildBreadcrumbEntity(id: string, items: BreadcrumbItem[]): SchemaEntity {
  return {
    '@type': 'BreadcrumbList',
    '@id': id,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Serialises JSON-LD for a <script type="application/ld+json"> body. `<` is
 * escaped so a title or excerpt containing "</script>" cannot close the tag
 * early and inject markup; JSON parsers read \u003c back as "<".
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/** Wraps entities into a single @graph JSON-LD object ready for stringify. */
export function assembleGraph(entities: SchemaEntity[]): object {
  return {
    '@context': 'https://schema.org',
    '@graph': entities,
  };
}

export interface ItemListEntityInput {
  id: string;
  name?: string;
  items: { name: string; url: string; image?: string | null }[];
}

export function buildItemListEntity(input: ItemListEntityInput): SchemaEntity {
  return {
    '@type': 'ItemList',
    '@id': input.id,
    ...(input.name && { name: input.name }),
    numberOfItems: input.items.length,
    itemListElement: input.items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: item.url,
      name: item.name,
      ...(item.image && { image: item.image }),
    })),
  };
}

export interface ServiceEntityInput {
  id: string;
  name: string;
  description: string;
  url: string;
  serviceType?: string;
  priceRange?: string;
  areaServed?: string;
  providerId: string;
}

export function buildServiceEntity(input: ServiceEntityInput): SchemaEntity {
  const entity: SchemaEntity = {
    '@type': 'Service',
    '@id': input.id,
    name: input.name,
    description: input.description,
    url: input.url,
    provider: { '@id': input.providerId },
    areaServed: input.areaServed || 'United Kingdom',
  };
  if (input.serviceType) entity.serviceType = input.serviceType;
  const offers = input.priceRange ? priceRangeToOffer(input.priceRange) : null;
  if (offers) entity.offers = offers;
  return entity;
}

// Turns display prices such as "From £499/month" or "£999 – £3,999" into a
// valid schema.org Offer: numeric prices in GBP, with a monthly unit for
// "/month". Returns null when no number can be read.
export function priceRangeToOffer(priceRange: string): SchemaEntity | null {
  const amounts = (priceRange.match(/\d[\d,]*(?:\.\d+)?/g) || []).map((n) => Number(n.replace(/,/g, '')));
  if (amounts.length === 0) return null;
  const monthly = /\/\s*(month|mo)\b|per month|monthly/i.test(priceRange);
  const low = Math.min(...amounts);
  const high = Math.max(...amounts);
  if (amounts.length > 1 && high > low) {
    return {
      '@type': 'AggregateOffer',
      priceCurrency: 'GBP',
      lowPrice: low,
      highPrice: high,
    };
  }
  return {
    '@type': 'Offer',
    priceCurrency: 'GBP',
    price: low,
    priceSpecification: {
      '@type': monthly ? 'UnitPriceSpecification' : 'PriceSpecification',
      priceCurrency: 'GBP',
      // "From £X": X is the minimum price.
      ...(/^\s*from\b/i.test(priceRange) ? { minPrice: low } : { price: low }),
      ...(monthly && { unitCode: 'MON', referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' } }),
    },
  };
}

export function buildFAQEntity(id: string, faqs: { question: string; answer: string }[]): SchemaEntity {
  return {
    '@type': 'FAQPage',
    '@id': id,
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}

/**
 * HowTo entity built from a list of process steps. Valid schema.org markup
 * that AI engines (ChatGPT, Perplexity, Gemini, Claude) parse to extract a
 * process. Google retired HowTo rich results in 2023, so this is for
 * LLM/AI extraction rather than a Google rich result.
 */
export function buildHowToEntity(
  id: string,
  name: string,
  steps: { title: string; text: string }[],
): SchemaEntity {
  return {
    '@type': 'HowTo',
    '@id': id,
    name,
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.title,
      text: step.text,
    })),
  };
}

export interface PageEntityInput {
  /** WebPage subtype: 'AboutPage' | 'ContactPage' | 'CollectionPage' | 'ProfilePage' | 'WebPage' */
  type: 'AboutPage' | 'ContactPage' | 'CollectionPage' | 'ProfilePage' | 'WebPage';
  id: string;
  url: string;
  name: string;
  description?: string | null;
  isPartOfId: string;
  breadcrumbId?: string;
  /** For CollectionPage: linked ItemList @id. */
  mainEntityListId?: string;
  /** @id of a Person who reviewed the page content (E-E-A-T signal). */
  reviewedById?: string;
  /** For ProfilePage: the Person the page is about. */
  mainEntityId?: string;
  inLanguage?: string;
}

export function buildPageEntity(input: PageEntityInput): SchemaEntity {
  const entity: SchemaEntity = {
    '@type': input.type,
    '@id': input.id,
    url: input.url,
    name: input.name,
    inLanguage: input.inLanguage || 'en-IE',
    isPartOf: { '@id': input.isPartOfId },
  };
  if (input.description) entity.description = input.description;
  if (input.breadcrumbId) entity.breadcrumb = { '@id': input.breadcrumbId };
  if (input.mainEntityListId) entity.mainEntity = { '@id': input.mainEntityListId };
  if (input.mainEntityId) entity.mainEntity = { '@id': input.mainEntityId };
  if (input.reviewedById) entity.reviewedBy = { '@id': input.reviewedById };
  return entity;
}

interface ServiceSchemaInput {
  name: string;
  description: string;
  url: string;
  serviceType?: string;
  priceRange?: string;
  areaServed?: string;
  providerName?: string;
  providerUrl?: string;
}

export function generateServiceSchema(input: ServiceSchemaInput): object {
  const provider = {
    '@type': 'Organization',
    name: input.providerName || 'MedicalAccountant.ie',
    url: input.providerUrl || input.url,
  };

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.name,
    description: input.description,
    url: input.url,
    provider,
    areaServed: input.areaServed || 'United Kingdom',
  };
  if (input.serviceType) schema.serviceType = input.serviceType;
  if (input.priceRange) schema.offers = {
    '@type': 'AggregateOffer',
    priceCurrency: 'GBP',
    priceSpecification: {
      '@type': 'PriceSpecification',
      priceCurrency: 'GBP',
      price: input.priceRange,
    },
  };
  return schema;
}

interface FaqEntry {
  question: string;
  answer: string;
}

export function generateFAQSchema(faqs: FaqEntry[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

interface ItemListEntry {
  name: string;
  url: string;
  image?: string | null;
}

export function generateItemListSchema(items: ItemListEntry[], name?: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    ...(name && { name }),
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: item.url,
      name: item.name,
      ...(item.image && { image: item.image }),
    })),
  };
}

interface CollectionPageInput {
  name: string;
  description: string;
  url: string;
  itemList?: ItemListEntry[];
}

export function generateCollectionPageSchema(input: CollectionPageInput): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: input.name,
    description: input.description,
    url: input.url,
    ...(input.itemList && input.itemList.length > 0 && {
      mainEntity: generateItemListSchema(input.itemList, input.name),
    }),
  };
}

interface SimplePageInput {
  name: string;
  description: string;
  url: string;
}

export function generateAboutPageSchema(input: SimplePageInput): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: input.name,
    description: input.description,
    url: input.url,
  };
}

export function generateContactPageSchema(input: SimplePageInput): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: input.name,
    description: input.description,
    url: input.url,
  };
}

interface OrganizationSchemaInput {
  name: string;
  url: string;
  logo?: string | null;
  description?: string | null;
  sameAs?: (string | null | undefined)[];
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export function generateOrganizationSchema(input: OrganizationSchemaInput): object {
  const sameAs = (input.sameAs || []).filter((s): s is string => Boolean(s));
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: input.name,
    url: input.url,
  };
  if (input.logo) schema.logo = input.logo;
  if (input.description) schema.description = input.description;
  if (sameAs.length > 0) schema.sameAs = sameAs;
  if (input.contactEmail || input.contactPhone) {
    schema.contactPoint = {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      ...(input.contactEmail && { email: input.contactEmail }),
      ...(input.contactPhone && { telephone: input.contactPhone }),
    };
  }
  return schema;
}
