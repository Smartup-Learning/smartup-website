export type NavLink = { label: string; href: string };
export type NavGroup = { title: string; links: NavLink[] };

export const navGroups: NavGroup[] = [
  { title: 'About us', links: [
    { label: 'Our Story', href: '/story' }, { label: 'Founders', href: '/founders' },
    { label: 'Faculty', href: '/faculty' }, { label: 'Life @ Smartup', href: '/life' } ] },
  { title: 'Learn', links: [
    { label: 'Courses', href: '/courses' }, { label: 'YouTube classes', href: '/videos' },
    { label: 'Blog', href: '/blog' }, { label: 'Ask Smartup', href: '/ask' },
    { label: 'Smartup App', href: '/app' }, { label: 'Smartup Quest', href: '/assessment/' } ] },
  { title: 'Proof', links: [
    { label: 'Results', href: '/results' }, { label: 'Testimonials', href: '/testimonials' },
    { label: 'Alumni', href: '/alumni' } ] },
  { title: 'Join', links: [
    { label: 'Free demo class', href: '/demo' }, { label: 'Community', href: '/community' },
    { label: 'Careers', href: '/careers' }, { label: 'Centres & contact', href: '/contact' } ] },
];

export const quickLinks: NavLink[] = [
  { label: 'Our Story', href: '/story' }, { label: 'Results', href: '/results' },
  { label: 'Courses', href: '/courses' }, { label: 'Contact', href: '/contact' },
];
