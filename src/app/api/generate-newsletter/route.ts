import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getFintocContextPrompt, FINTOC_CONTEXT } from '@/lib/fintoc-context';

const N8N_BASE = process.env.N8N_WEBHOOK_BASE || 'https://fintoc.app.n8n.cloud';

/**
 * POST /api/generate-newsletter
 * 
 * Triggers newsletter generation via n8n, now enriched with:
 * - Fintoc company context for personalized content
 * - Promoted signals with classifications
 * - Source diversity metadata
 * - Region distribution for validation
 */
export async function POST() {
    try {
          const supabase = createServiceClient();
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Gather promoted signals for the newsletter
      const { data: signals } = await supabase
            .from('articles')
            .select('id, title, url, source_domain, content_snippet, published_at, notes, pinned, classifications(*)')
            .eq('status', 'promoted')
            .gte('ingested_at', oneWeekAgo.toISOString())
            .order('published_at', { ascending: false });

      // Include pinned articles regardless of date
      const { data: pinned } = await supabase
            .from('articles')
            .select('id, title, url, source_domain, content_snippet, published_at, notes, pinned, classifications(*)')
            .eq('pinned', true)
            .eq('status', 'promoted');

      const allSignals = [...(signals || [])];
          for (const p of (pinned || [])) {
                  if (!allSignals.find(s => s.id === p.id)) {
                            allSignals.push(p);
                  }
          }

      // Enrich signals with classification data
      const enrichedSignals = allSignals.map(signal => {
              const topClass = (signal.classifications as any[])?.[0];
              return {
                        id: signal.id,
                        title: signal.title,
                        url: signal.url,
                        source: signal.source_domain,
                        snippet: signal.content_snippet,
                        published_at: signal.published_at,
                        notes: signal.notes,
                        pinned: signal.pinned,
                        region: topClass?.region || 'global',
                        topics: topClass?.topics || [],
                        relevance_score: topClass?.relevance_score || 0,
                        why_relevant: topClass?.why_relevant_to_fintoc || '',
                        evidence_quote: topClass?.evidence_quote || '',
              };
      });

      // Calculate metadata for n8n
      const regionCounts: Record<string, number> = {};
          const sourceDomains = new Set<string>();
          for (const s of enrichedSignals) {
                  regionCounts[s.region] = (regionCounts[s.region] || 0) + 1;
                  if (s.source) sourceDomains.add(s.source);
          }

      const res = await fetch(`${N8N_BASE}/webhook/curate-weekly`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                        triggered_from: 'app',
                        timestamp: new Date().toISOString(),
                        signals: enrichedSignals,
                        fintoc_context: getFintocContextPrompt(),
                        newsletter_config: FINTOC_CONTEXT.newsletter,
                        metadata: {
                                    total_signals: enrichedSignals.length,
                                    region_distribution: regionCounts,
                                    unique_sources: sourceDomains.size,
                        },
              }),
      });

      if (!res.ok) {
              const text = await res.text().catch(() => '');
              return NextResponse.json(
                { error: `n8n responded ${res.status}: ${text.substring(0, 200)}` },
                { status: 502 },
                      );
      }

      const data = await res.json().catch(() => ({}));
          return NextResponse.json({ ok: true, data, signals_sent: enrichedSignals.length });
    } catch (error) {
          return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
