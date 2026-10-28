import type { Route } from 'next';
import {
  BarChart3,
  Boxes,
  CalendarDays,
  CircleDollarSign,
  Crown,
  FileText,
  LayoutDashboard,
  Map,
  Network,
  Settings2,
  Trophy,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';

/**
 * The AXA Admin modules, as shown in the sidebar and the command palette.
 *
 * `permission` is what the signed-in person must hold to open the page. It is
 * the same name the backend checks on the matching routes, so the sidebar, the
 * route guard and the API all answer from one vocabulary.
 */
export interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  href?: Route;
  group: 'overview' | 'work' | 'org';
  permission?: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    key: 'work',
    label: 'Work',
    icon: LayoutDashboard,
    href: '/',
    group: 'overview',
    permission: 'work:read',
  },
  {
    key: 'executive',
    label: 'Executive',
    icon: Crown,
    href: '/executive' as Route,
    group: 'overview',
    permission: 'executive:read',
  },
  {
    key: 'productivity',
    label: 'Productivité',
    icon: Trophy,
    href: '/productivity' as Route,
    group: 'overview',
    permission: 'productivity:read',
  },
  {
    key: 'roadmap',
    label: 'Roadmap',
    icon: Map,
    href: '/roadmap' as Route,
    group: 'work',
    permission: 'work:read',
  },
  {
    key: 'projects',
    label: 'Projets',
    icon: Settings2,
    href: '/projects' as Route,
    group: 'work',
    permission: 'projects:manage',
  },
  {
    key: 'calendar',
    label: 'Calendar',
    icon: CalendarDays,
    href: '/calendar',
    group: 'work',
    permission: 'calendar:read',
  },
  {
    key: 'docs',
    label: 'Docs',
    icon: FileText,
    href: '/docs' as Route,
    group: 'work',
    permission: 'docs:read',
  },
  {
    key: 'departments',
    label: 'Départements',
    icon: Boxes,
    href: '/departments' as Route,
    group: 'org',
    permission: 'departments:manage',
  },
  {
    key: 'team',
    label: 'Team',
    icon: Users,
    href: '/team',
    group: 'org',
    permission: 'team:read',
  },
  {
    key: 'orgchart',
    label: 'Organigramme',
    icon: Network,
    href: '/orgchart' as Route,
    group: 'org',
    permission: 'orgchart:read',
  },
  {
    key: 'company',
    label: 'Company',
    icon: BarChart3,
    href: '/company' as Route,
    group: 'org',
    permission: 'executive:read',
  },
  {
    key: 'app-usage',
    label: 'App Usage',
    icon: CircleDollarSign,
    href: '/app-usage' as Route,
    group: 'org',
    permission: 'executive:read',
  },
  {
    key: 'account-requests',
    label: 'Requests',
    icon: UserPlus,
    href: '/requests' as Route,
    group: 'org',
    permission: 'requests:read',
  },
];

export const NAV_GROUPS: Array<{ id: NavItem['group']; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'work', label: 'Workspace' },
  { id: 'org', label: 'Organization' },
];

/**
 * The module a path belongs to: the longest matching `href`, so `/team/reports`
 * resolves to Team and not to Work.
 */
export function navItemFor(pathname: string): NavItem | undefined {
  return NAV_ITEMS.filter((item) => item.href !== undefined)
    .filter((item) =>
      item.href === '/'
        ? pathname === '/'
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => (b.href?.length ?? 0) - (a.href?.length ?? 0))[0];
}
