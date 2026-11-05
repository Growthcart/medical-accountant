// Validates the enquiry and forwards it to ENQUIRY_WEBHOOK_URL (email/CRM/Zapier etc.).
// Without that variable it answers 503 rather than pretending the message was sent.
const clean = (v, max) => String(v ?? '').trim().slice(0, max);

export async function POST(req) {
  let d;
  try { d = await req.json(); } catch { return Response.json({ error: 'Invalid request' }, { status: 400 }); }
  if (d.office_ref) return Response.json({ ok: true }); // honeypot: bots fill the hidden field

  const f = { name: clean(d.name, 100), email: clean(d.email, 254), phone: clean(d.phone, 40) };
  if (!f.name || !f.phone || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) return Response.json({ error: 'Missing details' }, { status: 400 });
  for (const k of ['professionalType', 'payroll', 'heardAbout', 'variant']) f[k] = clean(d[k], 100);
  f.message = clean(d.message, 2000);

  const url = process.env.ENQUIRY_WEBHOOK_URL;
  if (!url) return Response.json({ error: 'Enquiries are not configured' }, { status: 503 });
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ site: 'medicalaccountant.ie', ...f }) }).catch(() => null);
  return r?.ok ? Response.json({ ok: true }) : Response.json({ error: 'Could not send' }, { status: 502 });
}
