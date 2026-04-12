'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { FileSignature, Menu, X } from 'lucide-react';
import { useState } from 'react';

const NAV = [
  { href: '/',     label: 'Home' },
  { href: '/docs', label: 'API Docs' },
];

export function Header() {
  const { user, logout } = useAuth();
  const router  = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-brand-700">
          <FileSignature className="h-6 w-6" />
          <span>SignFlow</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`text-sm font-medium transition-colors ${
                pathname === n.href ? 'text-brand-700' : 'text-gray-600 hover:text-brand-700'
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-100 px-6 py-4 flex flex-col gap-3 bg-white">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-sm font-medium text-gray-700" onClick={() => setOpen(false)}>
              {n.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link href="/dashboard" className="text-sm font-medium text-gray-700" onClick={() => setOpen(false)}>Dashboard</Link>
              <button className="text-left text-sm text-red-600" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-gray-700" onClick={() => setOpen(false)}>Login</Link>
              <Link href="/register" className="text-sm font-medium text-brand-700" onClick={() => setOpen(false)}>Get Started</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
