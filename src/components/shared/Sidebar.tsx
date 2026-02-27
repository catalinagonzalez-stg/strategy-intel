'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/feed', label: 'Feed', icon: '📡' },
  { href: '/curation', label: 'Seleccion', icon: '✏️' },
  { href: '/sources', label: 'Fuentes', icon: '🔗' },
  { href: '/history', label: 'Histórico', icon: '📚' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col min-h-screen">
      <div className="px-4 py-5 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Strategy Intel
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">Fintoc</p>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
