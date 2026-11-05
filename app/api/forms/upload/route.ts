import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import type { FormFieldDefinition } from '@/lib/database.types';

// Leading bytes ("magic numbers") for each accepted type. DOCX is a ZIP
// container; DOC is an OLE2 compound file; WebP is RIFF....WEBP.
function matchesSignature(type: string, buf: Buffer): boolean {
  const starts = (...bytes: number[]) => bytes.every((b, i) => buf[i] === b);
  switch (type) {
    case 'image/jpeg':
      return starts(0xff, 0xd8, 0xff);
    case 'image/png':
      return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case 'image/webp':
      return buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
    case 'application/pdf':
      return buf.toString('ascii', 0, 5) === '%PDF-';
    case 'application/msword':
      return starts(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return starts(0x50, 0x4b, 0x03, 0x04);
    default:
      return false;
  }
}

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Rate limit: 10 uploads per minute per IP. Cross-instance safe — see
// lib/rateLimit.ts.
const UPLOAD_RATE_LIMIT = 10;
const UPLOAD_WINDOW_SECONDS = 60;

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);

    const { allowed } = await checkRateLimit(
      `forms:upload:${ip}`,
      UPLOAD_RATE_LIMIT,
      UPLOAD_WINDOW_SECONDS,
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many uploads. Please try again later.' },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const formId = formData.get('form_id') as string | null;

    if (!file || !formId) {
      return NextResponse.json({ error: 'File and form_id are required' }, { status: 400 });
    }

    // Validate formId is a UUID to prevent path traversal attacks
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(formId)) {
      return NextResponse.json({ error: 'Invalid form_id' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)} MB limit` },
        { status: 400 }
      );
    }

    // Validate MIME type
    const ext = ALLOWED_MIME_TYPES[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: `File type "${file.type}" is not allowed. Accepted: PDF, DOC, DOCX, JPG, PNG, WebP` },
        { status: 400 }
      );
    }

    // Only accept files for an active form that actually has a file field,
    // so the endpoint can't be used as an anonymous file host.
    const db = createServiceClient();
    const { data: form } = await db
      .from('contact_forms')
      .select('fields')
      .eq('id', formId)
      .eq('is_active', true)
      .maybeSingle();
    const fields = (form?.fields ?? []) as FormFieldDefinition[];
    if (!form || !fields.some((f) => f.type === 'file')) {
      return NextResponse.json({ error: 'This form does not accept file uploads' }, { status: 404 });
    }

    // The declared type comes from the browser; check the file's real
    // signature matches it.
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!matchesSignature(file.type, buffer)) {
      return NextResponse.json({ error: 'The file content does not match its type' }, { status: 400 });
    }

    // Generate unique filename using cryptographic randomness
    const randomBytes = new Uint8Array(8);
    crypto.getRandomValues(randomBytes);
    const randomStr = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const filename = `${formId}/${Date.now()}-${randomStr}${ext}`;

    // Store in Supabase Storage

    const { error: uploadError } = await db.storage
      .from('form-uploads')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Form file upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = db.storage
      .from('form-uploads')
      .getPublicUrl(filename);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
