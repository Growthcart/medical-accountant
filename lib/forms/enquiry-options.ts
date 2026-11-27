// Shared by the browser-side EnquiryForm and the server-side form definition
// (enquiry-form.ts), so the dropdown options and what the server accepts stay
// the same. Nothing server-only may be imported here.
export const ENQUIRY_FORM_SLUG = 'enquiry';

export const PROFESSIONAL_TYPES = ['Hospital Consultant', 'GP Practice', 'Locum Doctor', 'Dental Associates', 'Dental Practice'];
export const PAYROLL_SIZES = ['Only one -Owner', '1-5', '5-10', '10+'];
export const HEARD_ABOUT = ['Google Search Organic', 'Google Ads', 'Medical Magazine', 'Referred by Friend', 'Others'];

// Which version of the form was used ("Sent from" in Admin > Forms and the emails).
export const ENQUIRY_SOURCES = { enquiry: 'Enquiry form', contact: 'Contact page' } as const;
