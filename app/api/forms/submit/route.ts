import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/db/server';
import { publicUrlFor } from '@/lib/storage/public-url';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { sendFormNotification, sendUserConfirmation } from '@/lib/email';
import type { FormFieldDefinition } from '@/lib/database.types';

// Rate limit: 5 submissions per minute per IP. Backed by the
// `check_rate_limit` Postgres RPC so the cap is enforced across all
// serverless instances, not just the one that happened to handle a
// previous request.
const SUBMIT_RATE_LIMIT = 5;
const SUBMIT_WINDOW_SECONDS = 60;

// Outer envelope only — per-field type/format/option validation runs after
// we load the form definition from the DB, since the rules are dynamic
// per form.
const submitBodySchema = z.object({
  form_id: z.string().uuid(),
  data: z.record(z.string(), z.string()),
  honeypot: z.string().optional(),
});

// True when the value is a public URL that /api/forms/upload produced for
// this form: stored under form-uploads/{formId}/.
function isOwnFormUpload(value: string, formId: string): boolean {
  try {
    const url = new URL(value);
    const prefix = new URL(publicUrlFor('form-uploads', `${formId}/`));
    return url.origin === prefix.origin && url.pathname.startsWith(prefix.pathname);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);

    const { allowed } = await checkRateLimit(
      `forms:submit:${ip}`,
      SUBMIT_RATE_LIMIT,
      SUBMIT_WINDOW_SECONDS,
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429 }
      );
    }

    const parsed = submitBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const { form_id, data, honeypot } = parsed.data;

    // Honeypot check — if filled, return fake success
    if (honeypot) {
      return NextResponse.json({ success: true, message: 'Thank you for your submission.' });
    }

    const db = createServiceClient();

    // Load form definition
    const { data: form, error: formError } = await db
      .from('contact_forms')
      .select('*')
      .eq('id', form_id)
      .eq('is_active', true)
      .maybeSingle();

    if (formError || !form) {
      return NextResponse.json({ error: 'Form not found or inactive' }, { status: 404 });
    }

    const fields = form.fields as FormFieldDefinition[];

    // Server-side validation
    const sanitizedData: Record<string, string> = {};
    for (const field of fields) {
      const value = typeof data[field.name] === 'string' ? data[field.name].trim() : '';

      // Required check (checkbox has special handling)
      if (field.is_required) {
        if (field.type === 'checkbox' && value !== 'true') {
          return NextResponse.json(
            { error: `${field.label} must be checked` },
            { status: 400 }
          );
        } else if (field.type !== 'checkbox' && !value) {
          return NextResponse.json(
            { error: `${field.label} is required` },
            { status: 400 }
          );
        }
      }

      if (value) {
        // Email format validation
        if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return NextResponse.json(
            { error: `Please enter a valid email for ${field.label}` },
            { status: 400 }
          );
        }

        // URL format validation
        if (field.type === 'url' && !/^https?:\/\/.+/.test(value)) {
          return NextResponse.json(
            { error: `Please enter a valid URL for ${field.label}` },
            { status: 400 }
          );
        }

        // Date format validation
        if (field.type === 'date' && isNaN(Date.parse(value))) {
          return NextResponse.json(
            { error: `Please enter a valid date for ${field.label}` },
            { status: 400 }
          );
        }

        // Select / Radio options validation
        if ((field.type === 'select' || field.type === 'radio') && field.options && !field.options.includes(value)) {
          return NextResponse.json(
            { error: `Invalid option for ${field.label}` },
            { status: 400 }
          );
        }

        // Checkbox group validation
        if (field.type === 'checkbox_group' && field.options) {
          const selected = value.split(', ').filter(Boolean);
          const invalid = selected.find((v) => !field.options!.includes(v));
          if (invalid) {
            return NextResponse.json(
              { error: `Invalid option "${invalid}" for ${field.label}` },
              { status: 400 }
            );
          }
        }

        // Checkbox validation
        if (field.type === 'checkbox' && value !== 'true' && value !== 'false') {
          return NextResponse.json(
            { error: `Invalid value for ${field.label}` },
            { status: 400 }
          );
        }

        // File URL validation — must be this form's folder in our own
        // form-uploads bucket (a substring check let any site's URL through,
        // which then showed up as "View uploaded file" in the emails).
        if (field.type === 'file' && !isOwnFormUpload(value, form_id)) {
          return NextResponse.json(
            { error: `Invalid file for ${field.label}` },
            { status: 400 }
          );
        }

        // Truncate values to prevent abuse (skip file URLs)
        if (field.type === 'file') {
          sanitizedData[field.name] = value.slice(0, 2000);
        } else {
          const maxLen = field.type === 'textarea' ? 5000 : 500;
          sanitizedData[field.name] = value.slice(0, maxLen);
        }
      }
    }

    // Store submission
    const { error: insertError } = await db
      .from('form_submissions')
      .insert({
        form_id,
        data: sanitizedData,
        ip_address: ip,
        user_agent: request.headers.get('user-agent')?.slice(0, 500) || null,
      });

    if (insertError) {
      console.error('Form submission insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 });
    }

    // Send emails. Await both so the Worker isn't ended before
    // Resend is called. Failures are logged but don't fail the submission since
    // the data is already persisted.
    const recipientEmail = form.recipient_email || process.env.ADMIN_NOTIFICATION_EMAIL;
    const fieldInfos = fields.map((f) => ({ label: f.label, name: f.name, type: f.type }));
    const submittedAt = new Date().toISOString();

    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set — skipping email notifications.');
    }

    const emailJobs: Promise<unknown>[] = [];

    if (recipientEmail && process.env.RESEND_API_KEY) {
      emailJobs.push(
        sendFormNotification({
          formName: form.name,
          recipientEmail,
          fields: fieldInfos,
          data: sanitizedData,
          submitterIp: ip,
          submittedAt,
          customSubject: form.admin_email_subject,
          customTemplate: form.admin_email_template,
        }).catch((err) => {
          console.error('Resend admin email error:', err);
        })
      );
    }

    if (form.user_email_enabled && form.user_email_field && process.env.RESEND_API_KEY) {
      const userEmail = sanitizedData[form.user_email_field];
      if (userEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
        emailJobs.push(
          sendUserConfirmation({
            formName: form.name,
            userEmail,
            fields: fieldInfos,
            data: sanitizedData,
            customSubject: form.user_email_subject,
            customTemplate: form.user_email_template,
          }).catch((err) => {
            console.error('Resend user email error:', err);
          })
        );
      }
    }

    await Promise.all(emailJobs);

    return NextResponse.json({ success: true, message: form.success_message });
  } catch (err) {
    console.error('Form submit route error:', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
