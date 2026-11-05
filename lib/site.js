import content from './content.json';
import { buildPageMetadata } from './seo';

export { content };
export const SITE = {
  name: 'MedicalAccountant.ie',
  url: 'https://medicalaccountant.ie',
  phone: '+353 1211 8411',
  tel: '+35312118411',
  email: 'info@medicalaccountant.ie',
};

export const WHO = [
  { href: '/gp-accountants/', label: 'GPs' },
  { href: '/hospital-consultants/', label: 'Hospital Consultants' },
  { href: '/locum-accountants/', label: 'Locum Doctors' },
  { href: '/dental-accountants/', label: 'Dentists' },
  { href: '/accountants-nurses/', label: 'Nurses' },
  { href: '/company-formation/', label: 'Company Formation' },
];

export const OFFICES = [
  { name: 'Dublin Office', lines: ['10 Anglesea House', '63 Carysfort Avenue', 'Blackrock', 'Co. Dublin'] },
  { name: 'Kildare Office', lines: ['Moneycooley', 'Maynooth', 'Co Kildare, W23 P603'] },
];

const W = (f) => `/images/wp/${f}`;
// Page banners from the original site: wide desktop photo + portrait mobile crop (where one exists).
export const HEROES = {
  default: { desktop: W('medical-accountants.webp'), mobile: W('medical-accounants-ireland.webp') },
  'gp-accountants': { desktop: W('Accountancy-Services-for-GPs-.webp'), mobile: W('accountants-for-gp-ireland.webp') },
  'accountants-nurses': { desktop: W('Accountancy-Services-for-GPs-.webp'), mobile: W('accountants-for-gp-ireland.webp') },
  'hospital-consultants': { desktop: W('accountants-for-hospital-consultants.webp'), mobile: W('hospital-consultant-accountants-ireland.webp') },
  ihca: { desktop: W('accountants-for-hospital-consultants.webp'), mobile: W('hospital-consultant-accountants-ireland.webp') },
  'dental-accountants': { desktop: W('Accountants-For-Dentists-.webp'), mobile: W('accounting-firm-for-dentists.webp') },
  'locum-accountants': { desktop: W('Locum-Doctors-accountants.webp') },
  'company-formation': { desktop: W('Locum-Doctors-accountants.webp') },
};

// Next metadata for a page: the original WordPress SEO title/description (kept as-is for rankings),
// plus canonical, Open Graph image and Twitter card from the shared builder.
export function pageMeta(slug, path) {
  const p = content.pages[slug];
  return buildPageMetadata({ path, title: p.seoTitle, description: p.description, absoluteTitle: true });
}

export const fmtDate = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
