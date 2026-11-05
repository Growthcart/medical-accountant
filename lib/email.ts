// Resend's REST API over fetch, so this runs on Workers without the SDK.
async function sendEmail(msg: { from: string; to: string; subject: string; html: string }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(msg),
  });
  const body = await res.json().catch(() => ({}));
  return res.ok
    ? { data: body as { id: string }, error: null }
    : { data: null, error: { name: body.name as string | undefined, message: (body.message as string | undefined) || res.statusText } };
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
}: SendFormNotificationParams) {
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@resend.dev';
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
    from: `Forms <${fromEmail}>`,
    to: recipientEmail,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Resend admin send failed: ${error.name || 'error'} — ${error.message || JSON.stringify(error)}`);
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
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@resend.dev';
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
    from: `Forms <${fromEmail}>`,
    to: userEmail,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Resend user send failed: ${error.name || 'error'} — ${error.message || JSON.stringify(error)}`);
  }

  return sent;
}
