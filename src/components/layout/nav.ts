import {
  CreditCard,
  LayoutDashboard,
  PieChart,
  Receipt,
  Send,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Shown under the label in the expanded rail. */
  hint: string;
}

/** One list, used by the side rail, the mobile bar and the command sheet. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, hint: 'Position and activity' },
  { to: '/transactions', label: 'Transactions', icon: Receipt, hint: 'Search the ledger' },
  { to: '/cards', label: 'Cards', icon: CreditCard, hint: 'Controls and limits' },
  { to: '/transfers', label: 'Transfers', icon: Send, hint: 'Move money' },
  { to: '/analytics', label: 'Analytics', icon: PieChart, hint: 'Flow and categories' },
];
