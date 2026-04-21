'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, FileText, Send, Building2, User, BookOpen,
  LogOut, FileSignature, ChevronLeft, ChevronRight,
  BarChart2, Users, Store, MessageSquare, Ticket, PenLine, Shield, Webhook, ContactRound, CreditCard, LayoutTemplate,
} from 'lucide-react';
import { useState } from 'react';

const NAV_ITEMS = [
  { href: '/dashboard',                   label: 'Dashboard',              icon: LayoutDashboard },
  { href: '/dashboard/envelopes',         label: 'Envelopes',              icon: FileText },
  { href: '/dashboard/send',              label: 'Send Document',          icon: Send },
  { href: '/dashboard/my-signatures',     label: 'Awaiting My Signature',  icon: PenLine },
  { href: '/dashboard/contacts',          label: 'Signer Contacts',        icon: ContactRound },
  { href: '/dashboard/templates',         label: 'Document Templates',     icon: LayoutTemplate },
  { href: '/dashboard/merchant',          label: 'Merchant',               icon: Building2 },
  { href: '/dashboard/billing',           label: 'Billing & Plans',        icon: CreditCard },
  { href: '/dashboard/tickets',           label: 'Support Tickets',        icon: MessageSquare },
  { href: '/dashboard/settings/webhooks', label: 'Webhooks',               icon: Webhook },
  { href: '/docs',                        label: 'API Docs',               icon: BookOpen },
  { href: '/dashboard/profile',           label: 'Profile',                icon: User },
];

const ADMIN_NAV_ITEMS = [
  { href: '/dashboard/analytics',          label: 'Analytics',           icon: BarChart2 },
  { href: '/dashboard/admin/users',        label: 'User Management',     icon: Users },
  { href: '/dashboard/admin/merchants',    label: 'Merchant Management', icon: Store },
  { href: '/dashboard/admin/tickets',      label: 'Support Tickets',     icon: Ticket },
  { href: '/dashboard/admin/audit-logs',   label: 'Audit Logs',          icon: Shield },
];

export function DashboardSidebar() {
  const pathname         = usePathname();
  const router           = useRouter();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const isAdmin = user?.accessRole === 'Admin';

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
    const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'));
    return (
      <Link
        href={href}
        title={collapsed ? label : undefined}
        className={cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium mb-0.5 transition-colors',
          active
            ? 'bg-brand-50 text-brand-700'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span>{label}</span>}
      </Link>
    );
  }

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-gray-100 bg-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-gray-100 px-4">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2 font-bold text-brand-700">
            <FileSignature className="h-5 w-5 shrink-0" />
            <span className="text-lg">DocSignerHub</span>
          </Link>
        )}
        {collapsed && <FileSignature className="h-5 w-5 text-brand-700 mx-auto" />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto rounded-lg p-1 text-gray-400 hover:bg-gray-100"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* User info */}
      {!collapsed && user && (
        <div className="border-b border-gray-100 px-4 py-3">
          <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
          <p className="text-xs text-gray-500 truncate">{user.email}</p>
          {isAdmin && (
            <span className="mt-1 inline-block text-xs text-purple-700 bg-purple-50 rounded px-2 py-0.5 font-medium">
              Admin
            </span>
          )}
          {!user.isEmailVerified && (
            <span className="mt-1 inline-block text-xs text-amber-600 bg-amber-50 rounded px-2 py-0.5">
              ⚠ Email not verified
            </span>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {NAV_ITEMS.map(item => <NavLink key={item.href} {...item} />)}

        {isAdmin && (
          <>
            {!collapsed && (
              <p className="mt-4 mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Admin
              </p>
            )}
            {collapsed && <div className="my-3 border-t border-gray-100" />}
            {ADMIN_NAV_ITEMS.map(item => <NavLink key={item.href} {...item} />)}
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-100 p-3">
        <button
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
