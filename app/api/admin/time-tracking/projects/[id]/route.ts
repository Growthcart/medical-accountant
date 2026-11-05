import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/api/requireAdmin';

const updateProjectSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
});

// PATCH /api/admin/time-tracking/projects/[id] — update a project
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const gate = await requireAdmin(request);
  if (gate instanceof NextResponse) return gate;
  const { db } = gate;

  const parsed = updateProjectSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.name !== undefined) update.name = parsed.data.name.trim();
  if (parsed.data.description !== undefined) {
    update.description = parsed.data.description.trim() || null;
  }
  if (parsed.data.is_active !== undefined) update.is_active = parsed.data.is_active;

  const { data, error } = await db
    .from('projects')
    .update(update)
    .eq('id', params.id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ project: data });
}

// DELETE /api/admin/time-tracking/projects/[id] — delete a project (cascades entries)
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const gate = await requireAdmin(request);
  if (gate instanceof NextResponse) return gate;
  const { db } = gate;

  const { error } = await db.from('projects').delete().eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
