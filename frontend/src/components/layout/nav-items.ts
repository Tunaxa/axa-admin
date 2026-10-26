import type { Route } from 'next';
import {
  Building2,
  CalendarDays,
  CircleDollarSign,
  Crown,
  FileText,
  LayoutDashboard,
  Map,
  Network,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';

/**
 * The AXA Admin modules, as shown in the sidebar and the command palette.
 *
 * Grouped so the sidebar reads as a product map rather than a flat list.
 */
export interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  href?: Route;
  group: 'overview' | 'work' | 'org';
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'work', label: 'Work', icon: LayoutDashboard, href: '/', group: 'overview' },
  { key: 'executive', label: 'Executive', icon: Crown, href: '/executive' as Route, group: 'overview' },
  { key: 'roadmap', label: 'Roadmap', icon: Map, href: '/roadmap' as Route, group: 'work' },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays, href: '/calendar', group: 'work' },
  { key: 'docs', label: 'Docs', icon: FileText, href: '/docs' as Route, group: 'work' },
  { key: 'team', label: 'Team', icon: Users, href: '/team', group: 'org' },
  { key: 'orgchart', label: 'Organigramme', icon: Network, href: '/orgchart' as Route, group: 'org' },
  { key: 'company', label: 'Company', icon: Building2, href: '/company' as Route, group: 'org' },
  { key: 'app-usage', label: 'App Usage', icon: CircleDollarSign, href: '/app-usage' as Route, group: 'org' },
  { key: 'account-requests', label: 'Requests', icon: UserPlus, href: '/requests' as Route, group: 'org' },
];

export const NAV_GROUPS: Array<{ id: NavItem['group']; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'work', label: 'Workspace' },
  { id: 'org', label: 'Organization' },
];
