import {
  Building2,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  Map,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';

/**
 * The AXA Admin modules, as shown in the sidebar and the command palette.
 *
 * No `href` yet: the module routes do not exist, so nav items render as
 * non-navigating buttons. Links are added by the tasks that create the routes.
 */
export interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'work', label: 'Work', icon: LayoutDashboard },
  { key: 'roadmap', label: 'Roadmap', icon: Map },
  { key: 'team', label: 'Team', icon: Users },
  { key: 'company', label: 'Company', icon: Building2 },
  { key: 'docs', label: 'Docs', icon: FileText },
  { key: 'app-usage', label: 'App Usage', icon: CircleDollarSign },
  { key: 'account-requests', label: 'Account Requests', icon: UserPlus },
];
