export type NavLink = { label: string; href: string };
export type NavGroup = { title: string; links: NavLink[] };

export const navGroups: NavGroup[] = [
  { title: 'About us', links: [
    { label: 'Our Story', href: '/story' }, { label: 'Founders', href: '/founders' },
    { label: 'Faculty', href: '/faculty' }, { label: 'Life @ Smartup', href: '/life' },
    { label: 'Careers', href: '/careers' } ] },
  { title: 'Learn', links: [
    { label: 'Courses', href: '/courses' }, { label: 'YouTube classes', href: '/videos' },
    { label: 'Blog', href: '/blog' }, { label: 'Ask Smartup', href: '/ask' },
    { label: 'Smartup App', href: '/app' }, { label: 'Smartup Quest (free)', href: '/assessment/' } ] },
  { title: 'Results and reviews', links: [
    { label: 'Results', href: '/results' }, { label: 'Testimonials', href: '/testimonials' },
    { label: 'Alumni', href: '/alumni' } ] },
  { title: 'Get started', links: [
    { label: 'Free demo class', href: '/demo' }, { label: 'Centres & contact', href: '/contact' },
    { label: 'Community', href: '/community' } ] },
];

export const quickLinks: NavLink[] = [
  { label: 'Our Story', href: '/story' }, { label: 'Results', href: '/results' },
  { label: 'Courses', href: '/courses' }, { label: 'Smartup App', href: '/app' },
  { label: 'Contact', href: '/contact' },
];

/** True when `href` is the page being shown, or a section it belongs to (a blog post under /blog). */
export const isCurrent = (href: string, path: string) => path === href || (href !== '/' && href.length > 1 && path.startsWith(`${href}/`));
