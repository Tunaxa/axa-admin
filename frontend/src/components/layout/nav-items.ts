import type { Route } from 'next';
import {
  Building2,
  CircleDollarSign,
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
 * `href` is set only for modules that have a route. The rest still render as
 * non-navigating buttons, and gain a link when the task that builds the page
 * adds one.
 */
export interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  href?: Route;
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'work', label: 'Work', icon: LayoutDashboard, href: '/' },
  { key: 'roadmap', label: 'Roadmap', icon: Map },
  { key: 'team', label: 'Team', icon: Users, href: '/team' },
  { key: 'orgchart', label: 'Organigramme', icon: Network, href: '/orgchart' as Route },
  { key: 'company', label: 'Company', icon: Building2 },
  { key: 'docs', label: 'Docs', icon: FileText },
  { key: 'app-usage', label: 'App Usage', icon: CircleDollarSign },
  { key: 'account-requests', label: 'Account Requests', icon: UserPlus },
];
