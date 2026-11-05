import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { DbClient } from '@/lib/db/server';
import type { Database, TimeEntryWithProject } from '@/lib/database.types';
import { requireAdmin } from '@/lib/api/requireAdmin';
import { cappedEndIso, isStale, MAX_TASK_MINUTES } from '@/lib/timeTracking';

const startEntrySchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().optional(),
});

// Auto-finalize any running entry that has exceeded the cap, so a forgotten
// timer never inflates totals and never blocks a new start. Records the entry
// at started_at + MAX_TASK_MINUTES.
async function finalizeStaleRunning(db: DbClient) {
  const { data: running } = await db
    .from('time_entries')
    .select('id, started_at')
    .is('ended_at', null)
    .maybeSingle();

  if (running && isStale(running.started_at)) {
    await db
      .from('time_entries')
      .update({
        ended_at: cappedEndIso(running.started_at),
        duration_minutes: MAX_TASK_MINUTES,
        updated_at: new Date().toISOString(),
      })
      .eq('id', running.id);
  }
}

// Flatten the joined `projects(name)` relation into a `project_name` field.
function withProjectName(rows: unknown[]): TimeEntryWithProject[] {
  return (rows as Array<Record<string, unknown> & { projects: { name: string } | null }>).map(
    ({ projects, ...entry }) => ({
      ...(entry as unknown as TimeEntryWithProject),
      project_name: projects?.name ?? null,
    }),
  );
}

// GET /api/admin/time-tracking/entries?project_id=&from=&to=
// Returns the finished entries matching the filters plus the active running one.
export async function GET(request: NextRequest) {
  const gate = await requireAdmin(request);
  if (gate instanceof NextResponse) return gate;
  const { db } = gate;

  await finalizeStaleRunning(db);

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('project_id');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  let query = db
    .from('time_entries')
    .select('*, projects(name)')
    .order('started_at', { ascending: false });

  if (projectId) query = query.eq('project_id', projectId);
  if (from) query = query.gte('started_at', `${from}T00:00:00`);
  if (to) query = query.lte('started_at', `${to}T23:59:59.999`);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const all = withProjectName(data || []);
  const running = all.find((e) => e.ended_at === null) ?? null;
  const entries = all.filter((e) => e.ended_at !== null);

  return NextResponse.json({ entries, running });
}

// POST /api/admin/time-tracking/entries — start a task (one running at a time)
export async function POST(request: NextRequest) {
  const gate = await requireAdmin(request);
  if (gate instanceof NextResponse) return gate;
  const { db } = gate;

  const parsed = startEntrySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Close out a stale timer first, then block if a live one is still running.
  await finalizeStaleRunning(db);

  const { data: running } = await db
    .from('time_entries')
    .select('id')
    .is('ended_at', null)
    .maybeSingle();

  if (running) {
    return NextResponse.json(
      { error: 'A task is already running. Finish the current task first.' },
      { status: 409 },
    );
  }

  const { data, error } = await db
    .from('time_entries')
    .insert({
      project_id: parsed.data.project_id,
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry: data }, { status: 201 });
}
