'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * Thin top-bar that animates whenever the user clicks an internal link.
 * Completes and fades out once the new pathname is active.
 */
export function NavigationProgress() {
  const pathname    = usePathname();
  const [active, setActive]   = useState(false);
  const [width, setWidth]     = useState(0);
  const prevPath    = useRef(pathname);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Start the bar when any internal <a> is clicked
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || !href.startsWith('/') || href === pathname) return;

      // Clear any previous animation
      if (intervalRef.current) clearInterval(intervalRef.current);

      setActive(true);
      setWidth(18);

      let w = 18;
      intervalRef.current = setInterval(() => {
        // Slow down as it approaches 85%
        w = Math.min(w + Math.random() * 8 + 4, 85);
        setWidth(w);
        if (w >= 85 && intervalRef.current) clearInterval(intervalRef.current);
      }, 350);
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [pathname]);

  // Finish the bar when the route actually changes
  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    if (!active) return;

    if (intervalRef.current) clearInterval(intervalRef.current);
    setWidth(100);

    const t = setTimeout(() => {
      setActive(false);
      setWidth(0);
    }, 350);
    return () => clearTimeout(t);
  }, [pathname, active]);

  if (!active) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 z-[9999] h-[3px] bg-brand-600 transition-[width] duration-300 ease-in-out"
      style={{ width: `${width}%`, boxShadow: '0 0 8px rgba(79,70,229,0.6)' }}
    />
  );
}
