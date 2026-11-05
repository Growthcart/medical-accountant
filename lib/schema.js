import { SITE } from './site';

const ORG_ID = `${SITE.url}/#organization`;
const SITE_ID = `${SITE.url}/#website`;
const LOGO = `${SITE.url}/images/icons/icon-512.png`;

const OFFICES = [
  { id: 'dublin', name: 'Dublin Office', street: '10 Anglesea House, 63 Carysfort Avenue', city: 'Blackrock', region: 'County Dublin', postalCode: 'A94 X209' },
  { id: 'kildare', name: 'Kildare Office', street: 'Moneycooley', city: 'Maynooth', region: 'County Kildare', postalCode: 'W23 P603' },
];

// Organisation, its two offices and the website: the same entities on every page, referenced by @id.
function siteEntities() {
  return [
    {
      '@type': 'AccountingService',
      '@id': ORG_ID,
      name: SITE.name,
      url: SITE.url,
      description: 'Specialist medical accountants in Ireland: accounting, tax and business advice for GPs, hospital consultants, locum doctors, dentists and nurses.',
      logo: { '@type': 'ImageObject', url: LOGO },
      image: LOGO,
      telephone: SITE.phone,
      email: SITE.email,
      areaServed: { '@type': 'Country', name: 'Ireland' },
      knowsAbout: ['Medical accounting', 'Tax planning', 'Company formation', 'Payroll', 'Pension planning'],
      location: OFFICES.map((o) => ({ '@id': `${SITE.url}/#office-${o.id}` })),
    },
    ...OFFICES.map((o) => ({
      '@type': 'AccountingService',
      '@id': `${SITE.url}/#office-${o.id}`,
      name: `${SITE.name} – ${o.name}`,
      url: SITE.url,
      image: LOGO,
      telephone: SITE.phone,
      email: SITE.email,
      parentOrganization: { '@id': ORG_ID },
      address: { '@type': 'PostalAddress', streetAddress: o.street, addressLocality: o.city, addressRegion: o.region, postalCode: o.postalCode, addressCountry: 'IE' },
    })),
    { '@type': 'WebSite', '@id': SITE_ID, url: SITE.url, name: SITE.name, inLanguage: 'en-IE', publisher: { '@id': ORG_ID } },
  ];
}

// JSON-LD @graph for a site page. `kind`: 'home' | 'contact' | 'service' | 'page'.
export function pageGraph({ path, name, description, kind = 'page' }) {
  const url = SITE.url + path;
  const pageType = kind === 'contact' ? 'ContactPage' : 'WebPage';
  const graph = [
    ...siteEntities(),
    {
      '@type': pageType,
      '@id': `${url}#webpage`,
      url,
      name,
      ...(description && { description }),
      inLanguage: 'en-IE',
      isPartOf: { '@id': SITE_ID },
      about: { '@id': ORG_ID },
    },
  ];
  if (path !== '/') {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url + '/' },
        { '@type': 'ListItem', position: 2, name, item: url },
      ],
    });
    graph[graph.length - 2].breadcrumb = { '@id': `${url}#breadcrumb` };
  }
  if (kind === 'service') {
    graph.push({
      '@type': 'Service',
      '@id': `${url}#service`,
      name,
      serviceType: 'Accounting and tax services',
      provider: { '@id': ORG_ID },
      areaServed: { '@type': 'Country', name: 'Ireland' },
      url,
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}
