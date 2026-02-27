'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Badge from '@/components/shared/Badge';
import type { NewsletterEdition, NewsletterItem, Signal, ValidationResult } from '@/lib/supabase/types';
import ReactMarkdown from 'react-markdown';

interface Props {
  edition: NewsletterEdition | null;
  items: NewsletterItem[];
  signals: Signal[];
  unassignedSignals: Signal[];
}

export default function CurationClient({ edition, items, signals, unassignedSignals }: Props) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewMode, setPreviewMode] = useState<'md' | 'slack'>('md');

  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-newsletter', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error desconocido');
        return;
      }
      setTimeout(() => router.refresh(), 3000);
    } catch (e) {
      setError(String(e));
    } finally {
      setGenerating(false);
    }
  };

  const handleSendSlack = async () => {
    if (!edition) return;
    setSending(true);
    try {
      await fetch('/api/send-slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edition_id: edition.id }),
      });
      router.refresh();
    } finally {
      setSending(false);
    }
  };

  const validation = edition?.validation_result as ValidationResult | null;

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Seleccion semanal</h2>
              {edition && <Badge label={edition.status} />}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-4 py-2 text-xs font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded hover:opacity-90 disabled:opacity-50"
              >
                {generating ? 'Generando...' : 'Generar newsletter'}
              </button>
              {edition?.status === 'validated' && (
                <button
                  onClick={handleSendSlack}
                  disabled={sending}
                  className="px-4 py-2 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {sending ? 'Enviando...' : 'Enviar a Slack'}
                </button>
              )}
            </div>
          </div>
          {edition && (
            <p className="text-xs text-zinc-500 mt-1">
              Edición: {edition.edition_date} | Tema: {edition.tema_semana || '—'}
            </p>
          )}
        </header>

        {error && (
          <div className="px-6 py-3 bg-red-50 dark:bg-red-950/20 border-b border-red-200 dark:border-red-800">
            <p className="text-xs font-medium text-red-700 dark:text-red-400">Error: {error}</p>
          </div>
        )}

        {validation && !validation.valid && (
          <div className="px-6 py-3 bg-red-50 dark:bg-red-950/20 border-b border-red-200 dark:border-red-800">
            <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Validación fallida</p>
            <ul className="text-xs text-red-600 dark:text-red-400 space-y-0.5">
              {validation.errors.map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
            {validation.warnings.length > 0 && (
              <ul className="text-xs text-amber-600 dark:text-amber-400 mt-1 space-y-0.5">
                {validation.warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}
              </ul>
            )}
          </div>
        )}

        {validation && validation.valid && validation.warnings.length > 0 && (
          <div className="px-6 py-3 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-800">
            <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-0.5">
              {validation.warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}
            </ul>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 divide-x divide-zinc-200 dark:divide-zinc-800 h-full">
            {/* Left: Items / Signals */}
            <div className="overflow-auto p-4">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                Highlights en esta edicion ({items.length})
              </h3>
              {items.length === 0 && (
                <p className="text-xs text-zinc-400">No hay items. Genera el newsletter para crear el draft.</p>
              )}
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge label={item.section || '—'} variant="low" />
                      {item.low_evidence && <Badge label="low evidence" variant="med" />}
                      <span className="text-xs text-zinc-400">#{item.sort_order}</span>
                    </div>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 mb-1">{item.editorial_text}</p>
                    <div className="text-xs text-zinc-500 space-y-0.5">
                      <p>
                        Fuente:{' '}
                        <a href={item.supporting_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {item.supporting_source}
                        </a>
                        {' — '}
                        {item.supporting_published_at ? new Date(item.supporting_published_at).toLocaleDateString('es') : '—'}
                      </p>
                      <p className="italic">"{item.supporting_quote}"</p>
                    </div>
                  </div>
                ))}
              </div>

              {unassignedSignals.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mt-6 mb-3">
                    Highlights pendientes ({unassignedSignals.length})
                  </h3>
                  <div className="space-y-2">
                    {unassignedSignals.map(s => (
                      <div key={s.id} className="border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge label={s.signal_type} variant="low" />
                          <Badge label={s.impact_level || 'low'} />
                        </div>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300">{s.summary_factual}</p>
                        <p className="text-xs text-zinc-500 mt-1">{s.fintoc_implication}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Right: Preview */}
            <div className="overflow-auto p-4">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Preview</h3>
                <div className="flex rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-700">
                  <button
                    onClick={() => setPreviewMode('md')}
                    className={`px-2 py-0.5 text-xs ${previewMode === 'md' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-zinc-500'}`}
                  >Newsletter</button>
                  <button
                    onClick={() => setPreviewMode('slack')}
                    className={`px-2 py-0.5 text-xs ${previewMode === 'slack' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-zinc-500'}`}
                  >Slack</button>
                </div>
                {previewMode === 'slack' && edition?.content_slack && (() => {
                  const len = edition.content_slack!.length;
                  const ok = len <= 3900;
                  return (
                    <span className={`text-xs font-mono ${ok ? 'text-green-600' : 'text-red-600'}`}>
                      {len.toLocaleString()} chars {ok ? '✓' : `(se enviará en ${Math.ceil(len / 3900)} msgs)`}
                    </span>
                  );
                })()}
              </div>
              {edition?.content_md || edition?.content_slack ? (
                previewMode === 'md' ? (
                  <article className="max-w-none">
                    <div className="prose prose-zinc dark:prose-invert prose-sm prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-xl prose-h1:mb-4 prose-h2:text-base prose-h2:mt-6 prose-h2:mb-3 prose-p:leading-relaxed prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-zinc-900 dark:prose-blockquote:border-l-zinc-400 prose-blockquote:font-medium prose-blockquote:not-italic prose-hr:border-zinc-200 dark:prose-hr:border-zinc-800 prose-li:marker:text-zinc-400">
                      <ReactMarkdown>{edition.content_md || ''}</ReactMarkdown>
                    </div>
                  </article>
                ) : (
                  <pre className="whitespace-pre-wrap text-xs font-mono bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg leading-relaxed">
                    {edition.content_slack || ''}
                  </pre>
                )
              ) : (
                <p className="text-xs text-zinc-400">Sin contenido aún. Genera el newsletter.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
