import { emailBinding, envVar } from '@/lib/db/env';

// Cloudflare Email Sending through the Worker's `EMAIL` binding (wrangler.jsonc).
// Locally, `next dev` gets wrangler's simulator, which records the message
// instead of delivering it.

// True when the site can send email: the binding exists and a sender is set.
export function emailConfigured(): boolean {
  return Boolean(emailBinding() && envVar('EMAIL_FROM'));
}

async function sendEmail(msg: { to: string; subject: string; html: string; replyTo?: string }) {
  const binding = emailBinding();
  const from = envVar('EMAIL_FROM');
  if (!binding || !from) {
    return { data: null, error: { name: 'E_NOT_CONFIGURED', message: 'The EMAIL binding or EMAIL_FROM is not set' } };
  }
  try {
    const sent = await binding.send({
      from: { email: from, name: 'MedicalAccountant.ie' },
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      ...(msg.replyTo ? { replyTo: msg.replyTo } : {}),
    });
    return { data: { id: sent.messageId }, error: null };
  } catch (err) {
    // Binding errors carry a code such as E_RECIPIENT_PLAN_RESTRICTED (Free plan,
    // recipient not a verified destination) or E_SENDER_DOMAIN_NOT_AVAILABLE.
    const e = err as { code?: string; message?: string };
    return { data: null, error: { name: e.code, message: e.message || String(err) } };
  }
}

interface FormFieldInfo {
  label: string;
  name: string;
  type?: string;
}

interface SendFormNotificationParams {
  formName: string;
  recipientEmail: string;
  fields: FormFieldInfo[];
  data: Record<string, string>;
  submitterIp: string;
  submittedAt: string;
  customSubject?: string | null;
  customTemplate?: string | null;
  // The visitor's address, so the team can reply straight from the notification.
  replyTo?: string | null;
}

interface SendUserConfirmationParams {
  formName: string;
  userEmail: string;
  fields: FormFieldInfo[];
  data: Record<string, string>;
  customSubject?: string | null;
  customTemplate?: string | null;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Replace {{field_name}} placeholders in a template with actual values.
 * Also supports {{form_name}}, {{submitted_at}}, {{ip_address}}.
 */
function renderTemplate(
  template: string,
  fields: FormFieldInfo[],
  data: Record<string, string>,
  extras: Record<string, string> = {}
): string {
  let rendered = template;

  // Replace field placeholders
  for (const field of fields) {
    const value = data[field.name] || '';
    let displayValue: string;

    if (field.type === 'file' && value.startsWith('http')) {
      displayValue = `<a href="${escapeHtml(value)}" target="_blank" style="color: #2563eb; text-decoration: underline;">View uploaded file</a>`;
    } else if (field.type === 'checkbox') {
      displayValue = value === 'true' ? 'Yes' : 'No';
    } else {
      displayValue = escapeHtml(value);
    }

    rendered = rendered.replace(new RegExp(`\\{\\{${field.name}\\}\\}`, 'g'), displayValue);
  }

  // Replace extra placeholders (form_name, submitted_at, ip_address, all_fields)
  for (const [key, val] of Object.entries(extras)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
  }

  return rendered;
}

function buildFieldTable(fields: FormFieldInfo[], data: Record<string, string>): string {
  const fieldRows = fields
    .filter((f) => data[f.name])
    .map((f) => {
      const value = data[f.name];
      let displayValue: string;

      if (f.type === 'file' && value.startsWith('http')) {
        displayValue = `<a href="${escapeHtml(value)}" target="_blank" style="color: #2563eb; text-decoration: underline;">View uploaded file</a>`;
      } else if (f.type === 'checkbox') {
        displayValue = value === 'true' ? 'Yes' : 'No';
      } else {
        displayValue = escapeHtml(value);
      }

      return `<tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; width: 30%; vertical-align: top;">${escapeHtml(f.label)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #111827; white-space: pre-wrap;">${displayValue}</td>
        </tr>`;
    })
    .join('');

  return `<table style="width: 100%; border-collapse: collapse;">${fieldRows}</table>`;
}

function buildDefaultAdminHtml(formName: string, fields: FormFieldInfo[], data: Record<string, string>, submitterIp: string, submittedAt: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #2563eb; padding: 20px 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 18px;">New Form Submission: ${escapeHtml(formName)}</h1>
      </div>
      <div style="background-color: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        ${buildFieldTable(fields, data)}
        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p style="margin: 4px 0;">Submitted at: ${escapeHtml(submittedAt)}</p>
          <p style="margin: 4px 0;">IP Address: ${escapeHtml(submitterIp)}</p>
        </div>
      </div>
    </div>
  `;
}

function buildDefaultUserHtml(formName: string, fields: FormFieldInfo[], data: Record<string, string>): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #2563eb; padding: 20px 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 18px;">Thank you for your submission</h1>
      </div>
      <div style="background-color: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="color: #374151; font-size: 14px; margin: 0 0 16px;">Thank you for contacting us via <strong>${escapeHtml(formName)}</strong>. Here is a copy of your submission:</p>
        ${buildFieldTable(fields, data)}
        <p style="color: #6b7280; font-size: 12px; margin: 16px 0 0;">We will get back to you as soon as possible.</p>
      </div>
    </div>
  `;
}

export async function sendFormNotification({
  formName,
  recipientEmail,
  fields,
  data,
  submitterIp,
  submittedAt,
  customSubject,
  customTemplate,
  replyTo,
}: SendFormNotificationParams) {
  const subject = customSubject || `New submission: ${formName}`;

  let html: string;
  if (customTemplate) {
    const allFieldsHtml = buildFieldTable(fields, data);
    html = renderTemplate(customTemplate, fields, data, {
      form_name: escapeHtml(formName),
      submitted_at: escapeHtml(submittedAt),
      ip_address: escapeHtml(submitterIp),
      all_fields: allFieldsHtml,
    });
  } else {
    html = buildDefaultAdminHtml(formName, fields, data, submitterIp, submittedAt);
  }

  const { data: sent, error } = await sendEmail({
    to: recipientEmail,
    subject,
    html,
    replyTo: replyTo || undefined,
  });

  if (error) {
    throw new Error(`Admin email failed: ${error.name || 'error'} — ${error.message || JSON.stringify(error)}`);
  }

  return sent;
}

export async function sendUserConfirmation({
  formName,
  userEmail,
  fields,
  data,
  customSubject,
  customTemplate,
}: SendUserConfirmationParams) {
  const subject = customSubject || `Thank you for your submission (${formName})`;

  let html: string;
  if (customTemplate) {
    const allFieldsHtml = buildFieldTable(fields, data);
    html = renderTemplate(customTemplate, fields, data, {
      form_name: escapeHtml(formName),
      all_fields: allFieldsHtml,
    });
  } else {
    html = buildDefaultUserHtml(formName, fields, data);
  }

  const { data: sent, error } = await sendEmail({
    to: userEmail,
    subject,
    html,
  });

  if (error) {
    throw new Error(`User email failed: ${error.name || 'error'} — ${error.message || JSON.stringify(error)}`);
  }

  return sent;
}
