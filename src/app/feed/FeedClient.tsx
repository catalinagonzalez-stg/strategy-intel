'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Badge from '@/components/shared/Badge';
import type { Article, Classification, TopicEnum, Region } from '@/lib/supabase/types';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

type ArticleRow = Article & { classifications: Classification[] };

const TOPICS: TopicEnum[] = [
  'a2a','rails','payouts','payins','acquiring','card_networks','instant_payments',
  'open_banking','open_finance','regulacion','fraude','kyc_aml','lending',
  'treasury','cross_border','crypto_stablecoin','embedded_finance','competition','funding','infra'
];
const REGIONS: Region[] = ['CL','MX','BR','CO','PE','LATAM','global'];

export default function FeedClient({ articles }: { articles: ArticleRow[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<ArticleRow | null>(null);
  const [noteText, setNoteText] = useState('');
  const supabase = createClient();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/feed?${params.toString()}`);
  };

  const updateArticle = async (id: string, updates: Partial<Article>) => {
    await supabase.from('articles').update(updates).eq('id', id);
    router.refresh();
  };

  const topClass = (a: ArticleRow) => a.classifications?.[0];

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Feed</h2>
          <div className="flex gap-2 mt-3 flex-wrap">
            <select
              className="text-xs border rounded px-2 py-1 bg-white dark:bg-zinc-900 dark:border-zinc-700"
              value={searchParams.get('status') || 'all'}
              onChange={e => updateFilter('status', e.target.value)}
            >
              <option value="all">Todos los estados</option>
              <option value="new">New</option>
              <option value="promoted">Promoted</option>
              <option value="excluded">Excluded</option>
              <option value="noise">Noise</option>
            </select>
            <select
              className="text-xs border rounded px-2 py-1 bg-white dark:bg-zinc-900 dark:border-zinc-700"
              value={searchParams.get('region') || ''}
              onChange={e => updateFilter('region', e.target.value)}
            >
              <option value="">Todas las regiones</option>
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select
              className="text-xs border rounded px-2 py-1 bg-white dark:bg-zinc-900 dark:border-zinc-700"
              value={searchParams.get('topic') || ''}
              onChange={e => updateFilter('topic', e.target.value)}
            >
              <option value="">Todos los topics</option>
              {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              className="text-xs border rounded px-2 py-1 bg-white dark:bg-zinc-900 dark:border-zinc-700"
              value={searchParams.get('minScore') || ''}
              onChange={e => updateFilter('minScore', e.target.value)}
            >
              <option value="">Relevancia min</option>
              {[5,6,7,8,9].map(n => <option key={n} value={n}>{n}+</option>)}
            </select>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-zinc-500 w-24">Fecha</th>
                <th className="text-left px-4 py-2 font-medium text-zinc-500">Título</th>
                <th className="text-left px-4 py-2 font-medium text-zinc-500 w-28">Fuente</th>
                <th className="text-left px-4 py-2 font-medium text-zinc-500 w-16">Región</th>
                <th className="text-left px-4 py-2 font-medium text-zinc-500 w-32">Topics</th>
                <th className="text-center px-4 py-2 font-medium text-zinc-500 w-12">Rel</th>
                <th className="text-left px-4 py-2 font-medium text-zinc-500 w-20">Estado</th>
              </tr>
            </thead>
            <tbody>
              {articles.map(a => {
                const c = topClass(a);
                return (
                  <tr
                    key={a.id}
                    onClick={() => setSelected(a)}
                    className={`border-b border-zinc-100 dark:border-zinc-800/50 cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50 ${
                      selected?.id === a.id ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                    } ${a.pinned ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}`}
                  >
                    <td className="px-4 py-2 text-xs text-zinc-500 whitespace-nowrap">
                      {a.published_at
                        ? formatDistanceToNow(new Date(a.published_at), { addSuffix: true, locale: es })
                        : '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-900 dark:text-zinc-200">
                      <div className="flex items-center gap-1.5">
                        {a.pinned && <span title="Pinned">📌</span>}
                        <span className="line-clamp-1">{a.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-xs text-zinc-500 whitespace-nowrap">{a.source_domain || '—'}</td>
                    <td className="px-4 py-2 text-xs">{c?.region || '—'}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1 flex-wrap">
                        {(c?.topics || []).slice(0, 2).map(t => (
                          <Badge key={t} label={t} variant="low" />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      {c ? (
                        <span className={`font-mono text-xs font-bold ${
                          c.relevance_score >= 8 ? 'text-green-600' :
                          c.relevance_score >= 6 ? 'text-amber-600' : 'text-zinc-400'
                        }`}>{c.relevance_score}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2"><Badge label={a.status} /></td>
                  </tr>
                );
              })}
              {articles.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-zinc-400">No hay artículos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <aside className="w-96 border-l border-zinc-200 dark:border-zinc-800 overflow-auto bg-white dark:bg-zinc-950">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-start">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2">{selected.title}</h3>
            <button onClick={() => setSelected(null)} className="text-zinc-400 hover:text-zinc-600 text-lg ml-2">×</button>
          </div>
          <div className="p-4 space-y-4 text-sm">
            {selected.url && (
              <a href={selected.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs break-all">
                {selected.url}
              </a>
            )}
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-1">Snippet</p>
              <p className="text-zinc-700 dark:text-zinc-300 text-xs leading-relaxed">{selected.content_snippet || 'Sin snippet'}</p>
            </div>
            {topClass(selected) && (
              <>
                <div>
                  <p className="text-xs font-medium text-zinc-500 mb-1">Clasificación</p>
                  <div className="space-y-1 text-xs">
                    <p><span className="text-zinc-500">Relevancia:</span> {topClass(selected)!.relevance_score}/10</p>
                    <p><span className="text-zinc-500">Región:</span> {topClass(selected)!.region}</p>
                    <p><span className="text-zinc-500">Confianza:</span> {topClass(selected)!.confidence}</p>
                    <p><span className="text-zinc-500">Freshness:</span> {topClass(selected)!.freshness_days}d</p>
                    <p><span className="text-zinc-500">Weekly eligible:</span> {topClass(selected)!.is_weekly_eligible ? 'Sí' : 'No'}</p>
                  </div>
                </div>
                {topClass(selected)!.evidence_quote && (
                  <div>
                    <p className="text-xs font-medium text-zinc-500 mb-1">Evidence quote</p>
                    <p className="text-xs italic text-zinc-600 dark:text-zinc-400">"{topClass(selected)!.evidence_quote}"</p>
                  </div>
                )}
                {topClass(selected)!.why_relevant_to_fintoc && (
                  <div>
                    <p className="text-xs font-medium text-zinc-500 mb-1">Relevancia Fintoc</p>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300">{topClass(selected)!.why_relevant_to_fintoc}</p>
                  </div>
                )}
              </>
            )}

            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3">
              <p className="text-xs font-medium text-zinc-500 mb-2">Acciones</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => updateArticle(selected.id, { status: 'promoted' })}
                  className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                >Promover a señal</button>
                <button
                  onClick={() => updateArticle(selected.id, { status: 'excluded', excluded_reason: 'manual' })}
                  className="px-3 py-1.5 text-xs bg-zinc-200 dark:bg-zinc-800 rounded hover:bg-zinc-300"
                >Excluir</button>
                <button
                  onClick={() => updateArticle(selected.id, { status: 'noise' })}
                  className="px-3 py-1.5 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                >Ruido</button>
                <button
                  onClick={() => updateArticle(selected.id, { pinned: !selected.pinned })}
                  className="px-3 py-1.5 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                >{selected.pinned ? 'Desfijar' : 'Fijar'}</button>
              </div>
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3">
              <p className="text-xs font-medium text-zinc-500 mb-1">Notas</p>
              <textarea
                className="w-full text-xs border rounded p-2 bg-white dark:bg-zinc-900 dark:border-zinc-700"
                rows={3}
                value={noteText || selected.notes || ''}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Añadir nota..."
              />
              <button
                onClick={async () => {
                  await updateArticle(selected.id, { notes: noteText });
                  setNoteText('');
                }}
                className="mt-1 px-3 py-1 text-xs bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded hover:opacity-90"
              >Guardar nota</button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
