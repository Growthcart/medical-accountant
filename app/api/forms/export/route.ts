import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/requireAdmin';
import type { FormFieldDefinition } from '@/lib/database.types';

function escapeCsvValue(value: string): string {
  // Spreadsheet apps run cells starting with = + - @ (or tab/CR) as
  // formulas, so a submitter could plant =HYPERLINK(...) or a DDE payload.
  // Prefix those with ' so they open as text. Plain numbers and phone
  // numbers ("+44 7700 900123", "-5") are left alone.
  if (/^[=+\-@\t\r]/.test(value) && !/^[+-]?[\d\s().-]+$/.test(value)) {
    value = `'${value}`;
  }
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: NextRequest) {
  try {
    const formId = request.nextUrl.searchParams.get('form_id');
    if (!formId) {
      return NextResponse.json({ error: 'form_id is required' }, { status: 400 });
    }

    const gate = await requireAdmin(request);
    if (gate instanceof NextResponse) return gate;
    const { db } = gate;

    // Fetch form definition (service role already available)
    const { data: form, error: formError } = await db
      .from('contact_forms')
      .select('name, fields')
      .eq('id', formId)
      .maybeSingle();

    if (formError || !form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const fields = form.fields as FormFieldDefinition[];

    // Fetch all submissions
    const { data: submissions, error: subError } = await db
      .from('form_submissions')
      .select('id, data, ip_address, user_agent, is_read, created_at')
      .eq('form_id', formId)
      .order('created_at', { ascending: false });

    if (subError) {
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
    }

    // Build CSV
    const headers = [
      'Submission ID',
      'Date & Time',
      ...fields.map((f) => f.label),
      'IP Address',
      'User Agent',
      'Read',
    ];

    const rows = (submissions || []).map((sub: any) => {
      const submittedAt = new Date(sub.created_at).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      return [
        sub.id,
        submittedAt,
        ...fields.map((f) => {
          const val = sub.data?.[f.name] || '';
          if (f.type === 'checkbox') return val === 'true' ? 'Yes' : val === 'false' ? 'No' : '';
          return val;
        }),
        sub.ip_address || '',
        sub.user_agent || '',
        sub.is_read ? 'Yes' : 'No',
      ];
    });

    const csvContent = [
      headers.map(escapeCsvValue).join(','),
      ...rows.map((row: any) => row.map(escapeCsvValue).join(',')),
    ].join('\r\n');

    // Add BOM for Excel compatibility
    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;

    const safeName = form.name.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-');
    const dateStr = new Date().toISOString().split('T')[0];

    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeName}-submissions-${dateStr}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
