import { NextResponse } from 'next/server';
import { triggerN8n } from '@/lib/n8n/trigger';
import { createServiceClient } from '@/lib/supabase/server';
import { getFintocContextPrompt, FINTOC_CONTEXT } from '@/lib/fintoc-context';

/**
 * POST /api/cron/weekly-newsletter
 * 
 * Orchestrates the full weekly newsletter pipeline:
 * 1. Gathers promoted signals from the past 7 days
 * 2. Sends them to n8n with Fintoc context for newsletter generation
 * 3. Optionally auto-sends to Slack if all validations pass
 * 
 * Designed to run every Monday morning via external cron.
 */
export async function POST(request: Request) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
        const supabase = createServiceClient();
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Get promoted signals from the last 7 days
      const { data: signals } = await supabase
          .from('articles')
          .select('id, title, url, source_domain, content_snippet, published_at, notes, classifications(*)')
          .eq('status', 'promoted')
          .gte('ingested_at', oneWeekAgo.toISOString())
          .order('published_at', { ascending: false });

      // Also get pinned articles regardless of date
      const { data: pinned } = await supabase
          .from('articles')
          .select('id, title, url, source_domain, content_snippet, published_at, notes, classifications(*)')
          .eq('pinned', true)
          .eq('status', 'promoted');

      const allSignals = [...(signals || [])];
        for (const p of (pinned || [])) {
                if (!allSignals.find(s => s.id === p.id)) {
                          allSignals.push(p);
                }
        }

      if (allSignals.length === 0) {
              return NextResponse.json({ 
                                               success: false, 
                        message: 'No promoted signals found for this week.' 
              });
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

      const result = await triggerN8n('curate-weekly', {
              signals: enrichedSignals,
              fintoc_context: getFintocContextPrompt(),
              newsletter_config: FINTOC_CONTEXT.newsletter,
              week_label: `Semana del ${new Date().toLocaleDateString('es-CL')}`,
              metadata: {
                        total_signals: enrichedSignals.length,
                        region_distribution: regionCounts,
                        unique_sources: sourceDomains.size,
                        triggered_by: 'cron',
              },
      });

      console.log(`[cron/weekly-newsletter] Generated with ${enrichedSignals.length} signals`);

      return NextResponse.json({
              success: true,
              signals_count: enrichedSignals.length,
              unique_sources: sourceDomains.size,
              region_distribution: regionCounts,
              n8n_response: result,
              timestamp: new Date().toISOString(),
      });
  } catch (error) {
        console.error('[cron/weekly-newsletter] Error:', error);
        return NextResponse.json(
          { error: 'Weekly newsletter failed', details: String(error) },
          { status: 500 }
              );
  }
}

export async function GET(request: Request) {
    return POST(request);
}
