/**
 * Site navigation, shared by the header and the footer. `header` is the
 * narrowest viewport at which the link appears in the header bar, so the bar
 * fits a 360 px phone without scrolling; the footer always lists every link.
 */
export interface NavItem {
  href: string;
  label: string;
  header: 'all' | 'sm' | 'md';
}

export const SITE_NAV: readonly NavItem[] = [
  { href: '/units', label: 'Units', header: 'all' },
  { href: '/atlas', label: 'Atlas', header: 'all' },
  { href: '/homework', label: 'Homework', header: 'all' },
  { href: '/practice', label: 'Practice', header: 'sm' },
  { href: '/glossary', label: 'Glossary', header: 'sm' },
  { href: '/cases', label: 'Cases', header: 'md' },
  { href: '/materials', label: 'Materials', header: 'md' },
];
