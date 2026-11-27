import type { FormFieldDefinition } from '@/lib/database.types';
import { envVar } from '@/lib/db/env';
import { SITE } from '@/lib/site';
import {
  ENQUIRY_FORM_SLUG,
  ENQUIRY_SOURCES,
  HEARD_ABOUT,
  PAYROLL_SIZES,
  PROFESSIONAL_TYPES,
} from './enquiry-options';

type Db = ReturnType<typeof import('@/lib/db/server').createServiceClient>;

// The site-wide enquiry form (home, service pages, blog posts and /contact).
// It lives in contact_forms like any other CMS form, so its submissions,
// recipient and email wording are managed in Admin > Forms. It is created the
// first time someone submits it, so no database setup step is needed.
// Both variants share it; fields a variant doesn't show are left out of the emails.
// If you edit the dropdown options in Admin > Forms, change enquiry-options.ts to match.
export const ENQUIRY_FORM_FIELDS: FormFieldDefinition[] = [
  { id: 'name', name: 'name', label: 'Name', type: 'text', is_required: true, display_order: 0 },
  { id: 'email', name: 'email', label: 'Email', type: 'email', is_required: true, display_order: 1 },
  { id: 'phone', name: 'phone', label: 'Contact Number', type: 'phone', is_required: true, display_order: 2 },
  { id: 'professionalType', name: 'professionalType', label: 'Type of Medical Professional', type: 'select', options: PROFESSIONAL_TYPES, is_required: false, display_order: 3 },
  { id: 'payroll', name: 'payroll', label: 'No. of People on Payroll', type: 'select', options: PAYROLL_SIZES, is_required: false, display_order: 4 },
  { id: 'heardAbout', name: 'heardAbout', label: 'Where did you hear about us?', type: 'select', options: HEARD_ABOUT, is_required: false, display_order: 5 },
  { id: 'message', name: 'message', label: 'Message', type: 'textarea', is_required: false, display_order: 6 },
  { id: 'source', name: 'source', label: 'Sent from', type: 'select', options: Object.values(ENQUIRY_SOURCES), is_required: false, display_order: 7 },
];

const SELECT = '*';

export async function getOrCreateEnquiryForm(db: Db) {
  const existing = await db.from('contact_forms').select(SELECT).eq('slug', ENQUIRY_FORM_SLUG).maybeSingle();
  if (existing.data) return existing.data;

  const { data, error } = await db
    .from('contact_forms')
    .insert({
      name: 'Website enquiry',
      slug: ENQUIRY_FORM_SLUG,
      description: 'The enquiry form on the home, service and blog pages, and the /contact page.',
      fields: ENQUIRY_FORM_FIELDS,
      recipient_email: envVar('ADMIN_NOTIFICATION_EMAIL') || SITE.email,
      success_message: 'Thank you! We will get back to you soon.',
      is_active: true,
      admin_email_subject: 'New website enquiry',
      user_email_enabled: true,
      user_email_field: 'email',
      user_email_subject: 'Thank you for contacting MedicalAccountant.ie',
    })
    .select(SELECT)
    .single();
  if (data) return data;

  // Two first submissions at once: the other one created it.
  const retry = await db.from('contact_forms').select(SELECT).eq('slug', ENQUIRY_FORM_SLUG).maybeSingle();
  if (retry.data) return retry.data;
  throw new Error(`Could not create the enquiry form: ${error?.message}`);
}
