type Settings = { legalName?: string; email: string; phone: string | null; social: { url: string }[]; registeredOffice?: { address: string } };
type Centre = { name: string; phone: string; mapUrl: string };

/** EducationalOrganization data for search engines. "<" is escaped so no text can close the script tag. */
export function organisationJsonLd(settings: Settings, centres: Centre[], origin: string) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'Smartup',
    legalName: settings.legalName || undefined,
    url: `${origin}/`,
    logo: `${origin}/brand/logo.svg`,
    email: settings.email,
    telephone: settings.phone ?? undefined,
    address: settings.registeredOffice ? { '@type': 'PostalAddress', streetAddress: settings.registeredOffice.address, addressLocality: 'Kochi', addressRegion: 'Kerala', addressCountry: 'IN' } : undefined,
    sameAs: settings.social.map(s => s.url),
    department: centres.map(c => ({ '@type': 'EducationalOrganization', name: `Smartup ${c.name}`, telephone: c.phone, hasMap: c.mapUrl })),
  };
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
