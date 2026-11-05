import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/db/server';
import { getSessionUser } from '@/lib/auth/session';

// PATCH body — every field optional so the client can send a partial update.
// Strings get trimmed and empty-string → null normalisation downstream.
const profilePatchSchema = z.object({
  full_name: z.string().optional(),
  username: z.string().optional(),
  bio: z.string().optional(),
  profile_photo_url: z.string().optional(),
  job_title: z.string().optional(),
  linkedin_url: z.string().optional(),
  twitter_handle: z.string().optional(),
  website_url: z.string().optional(),
});

const PROFILE_BASE_COLUMNS = 'id, username, full_name, profile_photo_url, bio, role'
// Author-entity columns, selected together with the base list.
const PROFILE_AUTHOR_COLUMNS = 'job_title, linkedin_url, twitter_handle, website_url'
const PROFILE_FULL_COLUMNS = `${PROFILE_BASE_COLUMNS}, ${PROFILE_AUTHOR_COLUMNS}`

async function selectProfile(
  db: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<{ data: Record<string, unknown> | null; error: unknown }> {
  return db.from('profiles').select(PROFILE_FULL_COLUMNS).eq('id', userId).maybeSingle()
}

// GET /api/auth/profile — Fetch the authenticated user's profile
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const db = createServiceClient();

  const { data: profile, error: profileError } = await selectProfile(db, user.id);

  if (profileError) {
    return NextResponse.json({ error: (profileError as { message?: string }).message || 'Failed to load profile' }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  return NextResponse.json(profile);
}

// PATCH /api/auth/profile — Update the authenticated user's profile
export async function PATCH(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const db = createServiceClient();

  // Verify admin role
  const { data: existingProfile } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!existingProfile || existingProfile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = profilePatchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const {
    full_name,
    username,
    bio,
    profile_photo_url,
    job_title,
    linkedin_url,
    twitter_handle,
    website_url,
  } = parsed.data;

  const updateData: Record<string, string | null> = {
    full_name: full_name?.trim() || null,
    username: username?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  // Only update optional fields when explicitly provided in the request.
  if (bio !== undefined) updateData.bio = bio?.trim() || null;
  if (profile_photo_url !== undefined) updateData.profile_photo_url = profile_photo_url?.trim() || null;
  if (job_title !== undefined) updateData.job_title = job_title?.trim() || null;
  if (linkedin_url !== undefined) updateData.linkedin_url = linkedin_url?.trim() || null;
  if (twitter_handle !== undefined) {
    // Normalise: store without the leading @, but allow either input form.
    const handle = twitter_handle?.trim().replace(/^@/, '') || null;
    updateData.twitter_handle = handle;
  }
  if (website_url !== undefined) updateData.website_url = website_url?.trim() || null;

  const { data: updated, error: updateError } = await db
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)
    .select(PROFILE_FULL_COLUMNS)
    .maybeSingle()

  if (updateError) {
    const message = (updateError as { message?: string }).message?.includes('duplicate')
      ? 'That username is already taken.'
      : (updateError as { message?: string }).message || 'Failed to update profile'
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json(updated);
}
