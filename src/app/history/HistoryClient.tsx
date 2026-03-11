'use client';

import { useState, useEffect } from 'react';
import Badge from '@/components/shared/Badge';
import type { NewsletterEdition, NewsletterItem } from '@/lib/supabase/types';
import ReactMarkdown from 'react-markdown';

export default function HistoryClient({ editions }: { editions: NewsletterEdition[] }) {
  const [selected, setSelected] = useState<NewsletterEdition | null>(null);
  const [items, setItems] = useState<NewsletterItem[]>([]);
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!selected) { setItems([]); return; }
    fetch(`/api/newsletter-items?edition_id=${selected.id}`)
      .then(r => r.json())
      .then(data => setItems(data as NewsletterItem[]));
  }, [selected]);

  const filtered = search
    ? editions.filter(e =>
        (e.tema_semana || '').toLowerCase().includes(search.toLowerCase()) ||
        (e.content_md || '').toLowerCase().includes(search.toLowerCase())
      )
    : editions;

  const formatDate = (dateStr: string) => {
    if (!mounted) return dateStr.slice(0, 10);
    try {
      return new Date(dateStr).toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr.slice(0, 10);
    }
  };

  return (
    <div className="flex h-screen">
      <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Histórico</h2>
          <input
            className="w-full text-sm border rounded px-3 py-2 bg-white dark:bg-zinc-900 dark:border-zinc-700"
            placeholder="Buscar edición..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-auto">
          {filtered.map(e => (
            <button
              key={e.id}
              onClick={() => setSelected(e)}
              className={`w-full text-left px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors ${
                selected?.id === e.id ? 'bg-blue-50 dark:bg-blue-950/20' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-zinc-500">
                  {formatDate(e.week_label || e.created_at)}
                </span>
                <Badge label={e.status} />
              </div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200 line-clamp-1">
                {e.tema_semana || 'Sin tema'}
              </p>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-zinc-400 text-center py-8">No hay ediciones</p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {selected ? (
          <div className="p-6 max-w-3xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {selected.tema_semana || 'Sin tema'}
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  {formatDate(selected.week_label || selected.created_at)} · <Badge label={selected.status} />
                </p>
              </div>
            </div>

            {selected.highlights && selected.highlights.length > 0 && (
              <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-400 mb-2">Highlights</p>
                <ul className="space-y-1">
                  {selected.highlights.map((h: string, i: number) => (
                    <li key={i} className="text-sm text-amber-900 dark:text-amber-300">• {h}</li>
                  ))}
                </ul>
              </div>
            )}

            {items.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-medium text-zinc-500 mb-2">Items ({items.length})</p>
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.id} className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{item.section}</span>
                        <span className="text-xs text-zinc-500">Orden: {item.order_in_section}</span>
                      </div>
                      <p className="text-sm text-zinc-900 dark:text-zinc-200">{item.headline}</p>
                      {item.body_md && (
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{item.body_md}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selected.content_md && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{selected.content_md}</ReactMarkdown>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-400">
            <p className="text-sm">Selecciona una edición para ver el detalle</p>
          </div>
        )}
      </div>
    </div>
  );
}
