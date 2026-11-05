import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/api/requireAdmin';

const BUSINESS_ID = '00000000-0000-0000-0000-000000000002';

// All fields optional — the admin UI may patch a subset. Empty strings are
// allowed (downstream code trims and converts to null for storage).
const businessPutSchema = z.object({
  business_name: z.string().optional(),
  business_category: z.string().optional(),
  logo_url: z.string().optional(),
  description: z.string().optional(),
  address_street: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_postal_code: z.string().optional(),
  address_country: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().optional(),
  social_facebook: z.string().optional(),
  social_twitter: z.string().optional(),
  social_instagram: z.string().optional(),
  social_linkedin: z.string().optional(),
  social_youtube: z.string().optional(),
  social_tiktok: z.string().optional(),
  social_github: z.string().optional(),
}).passthrough(); // tolerate extra fields the admin UI may grow into

// PUT /api/admin/business — Upsert business information (admin only)
export async function PUT(request: NextRequest) {
  const gate = await requireAdmin(request);
  if (gate instanceof NextResponse) return gate;
  const { db, user } = gate;

  const parsed = businessPutSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const body = parsed.data;

  const { error } = await db
    .from('business_info')
    .upsert({
      id: BUSINESS_ID,
      business_name: body.business_name?.trim() || '',
      business_category: body.business_category?.trim() || null,
      logo_url: body.logo_url?.trim() || null,
      description: body.description?.trim() || null,
      address_street: body.address_street?.trim() || null,
      address_city: body.address_city?.trim() || null,
      address_state: body.address_state?.trim() || null,
      address_postal_code: body.address_postal_code?.trim() || null,
      address_country: body.address_country?.trim() || null,
      contact_phone: body.contact_phone?.trim() || null,
      contact_email: body.contact_email?.trim() || null,
      social_facebook: body.social_facebook?.trim() || null,
      social_twitter: body.social_twitter?.trim() || null,
      social_instagram: body.social_instagram?.trim() || null,
      social_linkedin: body.social_linkedin?.trim() || null,
      social_youtube: body.social_youtube?.trim() || null,
      social_tiktok: body.social_tiktok?.trim() || null,
      social_github: body.social_github?.trim() || null,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Business details feed the Organization schema, footer and llms.txt on
  // every cached page.
  revalidatePath('/', 'layout');
  return NextResponse.json({ success: true });
}
