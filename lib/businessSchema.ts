export interface BusinessInfo {
  business_name: string;
  business_category: string | null;
  logo_url: string | null;
  description: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_postal_code: string | null;
  address_country: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  social_facebook: string | null;
  social_twitter: string | null;
  social_instagram: string | null;
  social_linkedin: string | null;
  social_youtube: string | null;
  social_tiktok: string | null;
  social_github: string | null;
}

// Maps a freeform business_category string to a Schema.org @type.
// Returns 'ProfessionalService' for agency / consulting / dev categories,
// 'LocalBusiness' when an address is supplied, else 'Organization'.
// All three inherit address + contactPoint, so the local-pack signals
// remain regardless of the chosen type.
function pickSchemaType(business: BusinessInfo): 'ProfessionalService' | 'LocalBusiness' | 'Organization' {
  const cat = (business.business_category || '').toLowerCase();
  const professional = [
    'agency',
    'marketing',
    'consult',
    'development',
    'design',
    'software',
    'web',
  ];
  if (professional.some((kw) => cat.includes(kw))) return 'ProfessionalService';
  if (business.address_street || business.address_city) return 'LocalBusiness';
  return 'Organization';
}

export interface AggregateRatingInput {
  ratingValue: number;
  reviewCount: number;
  bestRating?: number;
  worstRating?: number;
}

export function generateLocalBusinessSchema(
  business: BusinessInfo,
  siteUrl: string,
  aggregateRating?: AggregateRatingInput,
): object {
  const sameAs = [
    business.social_facebook,
    business.social_twitter,
    business.social_instagram,
    business.social_linkedin,
    business.social_youtube,
    business.social_tiktok,
    business.social_github,
  ].filter(Boolean);

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': pickSchemaType(business),
    name: business.business_name,
    url: siteUrl,
  };

  if (business.description) schema.description = business.description;
  if (business.logo_url) schema.logo = business.logo_url;
  if (business.contact_phone) schema.telephone = business.contact_phone;
  if (business.contact_email) schema.email = business.contact_email;
  // Note: do NOT set schema.additionalType to business.business_category here.
  // additionalType in schema.org expects a URL pointing to a more specific
  // type — a free-text label like "Web Development" is invalid. The category
  // already determines @type above via pickSchemaType().

  if (business.address_street || business.address_city) {
    schema.address = {
      '@type': 'PostalAddress',
      ...(business.address_street && { streetAddress: business.address_street }),
      ...(business.address_city && { addressLocality: business.address_city }),
      ...(business.address_state && { addressRegion: business.address_state }),
      ...(business.address_postal_code && { postalCode: business.address_postal_code }),
      ...(business.address_country && { addressCountry: business.address_country }),
    };
  }

  if (sameAs.length > 0) schema.sameAs = sameAs;

  if (aggregateRating && aggregateRating.reviewCount > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: aggregateRating.ratingValue.toFixed(1),
      reviewCount: aggregateRating.reviewCount,
      bestRating: (aggregateRating.bestRating ?? 5).toString(),
      worstRating: (aggregateRating.worstRating ?? 1).toString(),
    };
  }

  return schema;
}

/**
 * Graph-form version of generateLocalBusinessSchema — returns the entity
 * WITHOUT `@context`, with a stable `@id`, ready to drop into a page-level
 * `@graph` array. Same logical content as the flat helper.
 */
export interface BusinessReviewInput {
  author: string;
  body: string;
  datePublished?: string;
}

export interface BuildLocalBusinessEntityOptions {
  aggregateRating?: AggregateRatingInput;
  /** URL to an editorial / publishing-principles page. Strong E-E-A-T signal. */
  publishingPrinciples?: string;
  /** Customer testimonials shown on the page, emitted as schema.org Review entities. */
  reviews?: BusinessReviewInput[];
}

// Published company details (footer, llms.txt), used for any field the
// admin Business Info has not filled in, and for the whole entity if the
// database read fails, so every page describes the same organisation.
export const DEFAULT_BUSINESS: BusinessInfo = {
  business_name: 'MedicalAccountant.ie',
  business_category: null,
  logo_url: null,
  description: null,
  address_street: null,
  address_city: null,
  address_state: null,
  address_postal_code: null,
  address_country: 'IE',
  contact_phone: '+353 1211 8411',
  contact_email: 'info@medicalaccountant.ie',
  social_facebook: null,
  social_twitter: null,
  social_instagram: null,
  social_linkedin: null,
  social_youtube: null,
  social_tiktok: null,
  social_github: null,
};

function withDefaults(business: BusinessInfo | null): BusinessInfo {
  const merged = { ...DEFAULT_BUSINESS };
  if (business) {
    for (const key of Object.keys(DEFAULT_BUSINESS) as Array<keyof BusinessInfo>) {
      const value = business[key];
      if (typeof value === 'string' && value.trim()) (merged as Record<string, unknown>)[key] = value.trim();
    }
  }
  return merged;
}

// Google requires a raster logo (it does not index SVG); fall back to the
// square PNG icon when the admin logo is missing or an SVG.
function rasterLogo(logoUrl: string | null, siteUrl: string): string {
  if (logoUrl && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(logoUrl)) return logoUrl;
  return `${siteUrl}/images/icons/icon-512.png`;
}

export function buildLocalBusinessEntity(
  businessInfo: BusinessInfo | null,
  siteUrl: string,
  id: string,
  options: BuildLocalBusinessEntityOptions = {},
): Record<string, unknown> {
  const business = withDefaults(businessInfo);
  const aggregateRating = options.aggregateRating;
  const sameAs = [
    business.social_facebook,
    business.social_twitter,
    business.social_instagram,
    business.social_linkedin,
    business.social_youtube,
    business.social_tiktok,
    business.social_github,
  ].filter(Boolean);

  const entity: Record<string, unknown> = {
    '@type': pickSchemaType(business),
    '@id': id,
    name: business.business_name,
    url: siteUrl,
  };

  if (business.description) entity.description = business.description;
  const logo = rasterLogo(business.logo_url, siteUrl);
  entity.logo = { '@type': 'ImageObject', url: logo };
  entity.image = logo;
  if (business.contact_phone) entity.telephone = business.contact_phone;
  if (business.contact_email) entity.email = business.contact_email;

  if (business.address_street || business.address_city) {
    entity.address = {
      '@type': 'PostalAddress',
      ...(business.address_street && { streetAddress: business.address_street }),
      ...(business.address_city && { addressLocality: business.address_city }),
      ...(business.address_state && { addressRegion: business.address_state }),
      ...(business.address_postal_code && { postalCode: business.address_postal_code }),
      ...(business.address_country && { addressCountry: business.address_country }),
    };
  }

  if (sameAs.length > 0) entity.sameAs = sameAs;
  if (options.publishingPrinciples) entity.publishingPrinciples = options.publishingPrinciples;

  if (aggregateRating && aggregateRating.reviewCount > 0) {
    entity.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: aggregateRating.ratingValue.toFixed(1),
      reviewCount: aggregateRating.reviewCount,
      bestRating: (aggregateRating.bestRating ?? 5).toString(),
      worstRating: (aggregateRating.worstRating ?? 1).toString(),
    };
  }

  if (options.reviews && options.reviews.length > 0) {
    entity.review = options.reviews.map((review) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: review.author },
      reviewBody: review.body,
      ...(review.datePublished && { datePublished: review.datePublished }),
    }));
  }

  return entity;
}

export function generateWebPageSchema(
  title: string,
  description: string,
  url: string,
  siteUrl: string,
  businessName: string,
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url,
    isPartOf: { '@type': 'WebSite', name: businessName, url: siteUrl },
  };
}
