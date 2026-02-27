'use client';

import { useState, useEffect } from 'react';
import Badge from '@/components/shared/Badge';
import type { NewsletterEdition, NewsletterItem } from '@/lib/supabase/types';
import ReactMarkdown from 'react-markdown';

export default function HistoryClient({ editions }: { editions: NewsletterEdition[] }) {
  const [selected, setSelected] = useState<NewsletterEdition | null>(null);
  const [items, setItems] = useState<NewsletterItem[]>([]);
  const [search, setSearch] = useState('');

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

  return (
    <div className="flex h-screen">
      <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden">
        <div className="px-4 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Histórico</h2>
          <input
            className="w-full text-xs border rounded px-3 py-2 bg-white dark:bg-zinc-900 dark:border-zinc-700"
            placeholder="Buscar en ediciones..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-auto">
          {filtered.map(e => (
            <button
              key={e.id}
              onClick={() => setSelected(e)}
              className={`w-full text-left px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 ${
                selected?.id === e.id ? 'bg-blue-50 dark:bg-blue-950/20' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{e.edition_date}</span>
                <Badge label={e.status} />
              </div>
              <p className="text-xs text-zinc-500 line-clamp-1">{e.tema_semana || 'Sin tema'}</p>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-zinc-400 text-center py-8">No hay ediciones</p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {selected ? (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{selected.edition_date}</h3>
              <Badge label={selected.status} />
              {selected.sent_at && (
                <span className="text-xs text-zinc-500">Enviado: {new Date(selected.sent_at).toLocaleString('es')}</span>
              )}
            </div>
            {selected.tema_semana && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Tema: {selected.tema_semana}</p>
            )}

            {selected.content_md && (
              <div className="prose prose-sm dark:prose-invert max-w-none mb-8">
                <ReactMarkdown>{selected.content_md}</ReactMarkdown>
              </div>
            )}

            {items.length > 0 && (
              <div className="mt-8">
                <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Items con fuentes</h4>
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.id} className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge label={item.section || '—'} variant="low" />
                        {item.low_evidence && <Badge label="low evidence" variant="med" />}
                      </div>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300">{item.editorial_text}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        <a href={item.supporting_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {item.supporting_source}
                        </a>
                        {' — '}
                        {item.supporting_published_at ? new Date(item.supporting_published_at).toLocaleDateString('es') : '—'}
                      </p>
                      <p className="text-xs italic text-zinc-400 mt-0.5">"{item.supporting_quote}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-400 text-sm">
            Selecciona una edición para ver el detalle
          </div>
        )}
      </div>
    </div>
  );
}
