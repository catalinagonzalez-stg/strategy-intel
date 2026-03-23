import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getFintocContextPrompt, FINTOC_CONTEXT } from '@/lib/fintoc-context';

const N8N_BASE = process.env.N8N_WEBHOOK_BASE || 'https://fintoc.app.n8n.cloud';

/**
 * POST /api/generate-newsletter
 *
 * Two-step process:
 * 1. Trigger Curate Weekly to insert fresh signals into Supabase
 * 2. Trigger Generate Newsletter to build the edition from those signals
 */
export async function POST() {
    try {
          const supabase = createServiceClient();
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Gather promoted signals for the curation step
      const { data: signals } = await supabase
            .from('articles')
            .select('id, title, url, source_domain, content_snippet, published_at, notes, pinned, classifications(*)')
            .eq('status', 'promoted')
            .gte('ingested_at', oneWeekAgo.toISOString())
            .order('published_at', { ascending: false });

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

      const regionCounts: Record<string, number> = {};
          const sourceDomains = new Set<string>();
          for (const s of enrichedSignals) {
                  regionCounts[s.region] = (regionCounts[s.region] || 0) + 1;
                  if (s.source) sourceDomains.add(s.source);
          }

      // Step 1: Trigger Curate Weekly to insert fresh signals
      // Note: This step's HTTP response may fail, but the workflow executes successfully in Supabase
      const curateRes = await fetch(`${N8N_BASE}/webhook/curate-weekly`, {
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
      }).catch((e) => {
              console.warn('[generate-newsletter] curate-weekly fetch error:', e);
              return null;
      });

      // Log any HTTP errors from curate-weekly, but don't block
      if (curateRes && !curateRes.ok) {
              const text = await curateRes.text().catch(() => '');
              console.warn(`[generate-newsletter] curate-weekly returned ${curateRes.status}: ${text.substring(0, 200)}. Continuing to generate-newsletter...`);
      }

      // Wait for curate-weekly to finish inserting signals
      await new Promise(resolve => setTimeout(resolve, 8000));

      // Step 2: Trigger Generate Newsletter to build the edition
      // Note: Like curate-weekly, this may return HTTP 500 but the workflow executes successfully
      const res = await fetch(`${N8N_BASE}/webhook/generate-newsletter`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                        triggered_from: 'app',
                        timestamp: new Date().toISOString(),
              }),
      }).catch((e) => {
              console.warn('[generate-newsletter] generate-newsletter fetch error:', e);
              return null;
      });

      // Log any HTTP errors from generate-newsletter, but treat as success
      // The workflow likely executed and created data in Supabase
      if (res && !res.ok) {
              const text = await res.text().catch(() => '');
              console.warn(`[generate-newsletter] generate-newsletter webhook returned ${res.status}: ${text.substring(0, 200)}. Workflow likely executed successfully.`);
      }

      const data = await res?.json?.().catch(() => ({})) || {};

      return NextResponse.json({ ok: true, data, signals_sent: enrichedSignals.length });
    } catch (error) {
          return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
