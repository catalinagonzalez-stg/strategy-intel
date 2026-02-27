'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Badge from '@/components/shared/Badge';
import type { Source } from '@/lib/supabase/types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  sources: Source[];
  latestBySource: Record<string, string>;
}

export default function SourcesClient({ sources, latestBySource }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [newSource, setNewSource] = useState({ name: '', type: 'rss' as Source['type'], url: '' });

  const toggleActive = async (id: string, active: boolean) => {
    await fetch('/api/sources', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    });
    router.refresh();
  };

  const addSource = async () => {
    if (!newSource.name) return;
    await fetch('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSource.name, type: newSource.type, url: newSource.url || null }),
    });
    setNewSource({ name: '', type: 'rss', url: '' });
    setShowForm(false);
    router.refresh();
  };

  const deleteSource = async (id: string) => {
    await fetch('/api/sources', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Fuentes</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-xs font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded hover:opacity-90"
        >
          {showForm ? 'Cancelar' : 'Agregar fuente'}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-3">
          <input
            className="w-full text-sm border rounded px-3 py-2 bg-white dark:bg-zinc-900 dark:border-zinc-700"
            placeholder="Nombre de la fuente"
            value={newSource.name}
            onChange={e => setNewSource({ ...newSource, name: e.target.value })}
          />
          <div className="flex gap-3">
            <select
              className="text-sm border rounded px-3 py-2 bg-white dark:bg-zinc-900 dark:border-zinc-700"
              value={newSource.type}
              onChange={e => setNewSource({ ...newSource, type: e.target.value as Source['type'] })}
            >
              <option value="rss">RSS</option>
              <option value="email">Email</option>
              <option value="serper">Serper</option>
              <option value="slack">Slack</option>
              <option value="twitter">Twitter</option>
            </select>
            <input
              className="flex-1 text-sm border rounded px-3 py-2 bg-white dark:bg-zinc-900 dark:border-zinc-700"
              placeholder="URL (opcional)"
              value={newSource.url}
              onChange={e => setNewSource({ ...newSource, url: e.target.value })}
            />
          </div>
          <button
            onClick={addSource}
            className="px-4 py-2 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700"
          >Guardar</button>
        </div>
      )}

      <div className="space-y-2">
        {sources.map(s => (
          <div
            key={s.id}
            className={`flex items-center justify-between p-4 border rounded-lg ${
              s.active
                ? 'border-zinc-200 dark:border-zinc-800'
                : 'border-zinc-100 dark:border-zinc-900 opacity-60'
            }`}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleActive(s.id, s.active)}
                className={`w-9 h-5 rounded-full relative transition-colors ${
                  s.active ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  s.active ? 'left-4' : 'left-0.5'
                }`} />
              </button>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{s.name}</p>
                <p className="text-xs text-zinc-500">{s.type}{s.url ? ` — ${s.url}` : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {latestBySource[s.id] ? (
                <span className="text-xs text-zinc-500">
                  Último: {formatDistanceToNow(new Date(latestBySource[s.id]), { addSuffix: true, locale: es })}
                </span>
              ) : (
                <span className="text-xs text-zinc-400">Sin artículos</span>
              )}
              <Badge label={s.type} variant="low" />
              <button
                onClick={() => deleteSource(s.id)}
                className="text-xs text-red-500 hover:text-red-700"
              >Eliminar</button>
            </div>
          </div>
        ))}
        {sources.length === 0 && (
          <p className="text-sm text-zinc-400 text-center py-8">No hay fuentes configuradas</p>
        )}
      </div>
    </div>
  );
}
