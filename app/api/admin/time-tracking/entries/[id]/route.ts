import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/api/requireAdmin';
import { computeDurationMinutes } from '@/lib/timeTracking';

const patchEntrySchema = z.object({
  action: z.literal('stop').optional(),
  started_at: z.string().datetime().optional(),
  ended_at: z.string().datetime().optional(),
  title: z.string().trim().min(1).optional(),
  description: z.string().optional(),
});

// PATCH /api/admin/time-tracking/entries/[id]
// - { action: 'stop' } stops a running entry now (capped duration)
// - { started_at?, ended_at?, title?, description? } corrects a recorded entry
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const gate = await requireAdmin(request);
  if (gate instanceof NextResponse) return gate;
  const { db } = gate;

  const parsed = patchEntrySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { data: entry, error: fetchError } = await db
    .from('time_entries')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!entry) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (parsed.data.title !== undefined) update.title = parsed.data.title.trim();
  if (parsed.data.description !== undefined) {
    update.description = parsed.data.description.trim() || null;
  }

  // Resolve effective start/end after applying any provided corrections.
  const startedAt = parsed.data.started_at ?? entry.started_at;
  let endedAt = parsed.data.ended_at ?? entry.ended_at;

  if (parsed.data.action === 'stop') {
    endedAt = new Date().toISOString();
  }

  if (parsed.data.started_at !== undefined) update.started_at = parsed.data.started_at;
  if (endedAt !== entry.ended_at) update.ended_at = endedAt;

  // Whenever the entry has an end time, keep duration in sync (capped).
  if (endedAt) {
    update.duration_minutes = computeDurationMinutes(startedAt, endedAt);
  }

  const { data, error } = await db
    .from('time_entries')
    .update(update)
    .eq('id', params.id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry: data });
}

// DELETE /api/admin/time-tracking/entries/[id]
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const gate = await requireAdmin(request);
  if (gate instanceof NextResponse) return gate;
  const { db } = gate;

  const { error } = await db.from('time_entries').delete().eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
