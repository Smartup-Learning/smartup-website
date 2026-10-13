/**
 * The public origin for absolute links (canonical, Open Graph, sitemap).
 * SITE_URL wins (set it in production, behind the proxy). Otherwise server.mjs passes the request's
 * own address, because Astro does not trust the Host header and reports localhost:4321.
 */
export const siteOrigin = (locals: App.Locals, url: URL) => (process.env.SITE_URL || locals.origin || url.origin).replace(/\/+$/, '');

/** Preview deployments set NOINDEX=1 so search engines leave them alone. */
export const hiddenFromSearch = () => process.env.NOINDEX === '1';
