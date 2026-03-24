import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateSignal } from '@/lib/ai/signals';

/**
 * POST /api/curate-weekly
 *
 * Native curate-weekly pipeline (replaces n8n workflow):
 * 1. Fetches promoted articles from the last 30 days (+ pinned)
 * 2. Enriches them with classification data
 * 3. Generates strategic signals using Claude AI
 * 4. Inserts signals into Supabase
 */
export async function POST() {
  try {
    const supabase = createServiceClient();
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - 30);

    // Gather promoted articles from last 30 days
    const { data: recentArticles } = await supabase
      .from('articles')
      .select('id, title, url, source_domain, content_snippet, published_at, notes, pinned, classifications(*)')
      .eq('status', 'promoted')
      .gte('ingested_at', lookbackDate.toISOString())
      .order('published_at', { ascending: false });

    // Also include pinned articles regardless of date
    const { data: pinnedArticles } = await supabase
      .from('articles')
      .select('id, title, url, source_domain, content_snippet, published_at, notes, pinned, classifications(*)')
      .eq('pinned', true)
      .eq('status', 'promoted');

    // Merge without duplicates
    const allArticles = [...(recentArticles || [])];
    for (const p of (pinnedArticles || [])) {
      if (!allArticles.find(a => a.id === p.id)) {
        allArticles.push(p);
      }
    }

    if (allArticles.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'No promoted articles to curate',
        signals_created: 0,
      });
    }

    // Check which articles already have signals (avoid duplicates)
    const articleIds = allArticles.map(a => a.id);
    const { data: existingSignals } = await supabase
      .from('signals')
      .select('article_id')
      .in('article_id', articleIds);

    const articlesWithSignals = new Set((existingSignals || []).map((s: { article_id: string }) => s.article_id));
    const articlesToProcess = allArticles.filter(a => !articlesWithSignals.has(a.id));

    if (articlesToProcess.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'All promoted articles already have signals',
        signals_created: 0,
      });
    }

    console.log(`[curate-weekly] Processing ${articlesToProcess.length} articles (${allArticles.length} total promoted, ${articlesWithSignals.size} already have signals)`);

    let signalsCreated = 0;
    const errors: string[] = [];

    for (const article of articlesToProcess) {
      try {
        const topClass = (article.classifications as any[])?.[0];

        const signalResult = await generateSignal({
          id: article.id,
          title: article.title,
          url: article.url,
          source_domain: article.source_domain,
          content_snippet: article.content_snippet,
          published_at: article.published_at,
          notes: article.notes,
          region: topClass?.region || 'global',
          topics: topClass?.topics || [],
          relevance_score: topClass?.relevance_score || 0,
          why_relevant: topClass?.why_relevant_to_fintoc || '',
        });

        // Insert signal into Supabase
        const { error: insertErr } = await supabase
          .from('signals')
          .insert({
            article_id: article.id,
            signal_type: signalResult.signal_type,
            impact_level: signalResult.impact_level,
            horizon: signalResult.horizon,
            summary_factual: signalResult.summary_factual,
            fintoc_implication: signalResult.fintoc_implication,
            supporting_url: article.url || '',
            supporting_source: article.source_domain || '',
            supporting_published_at: article.published_at || new Date().toISOString(),
            supporting_quote: topClass?.evidence_quote || '',
            low_evidence: signalResult.low_evidence,
            edition_id: null,
          });

        if (insertErr) {
          errors.push(`Signal insert error for "${article.title}": ${insertErr.message}`);
        } else {
          signalsCreated++;
        }

        // Rate limit delay
        await new Promise(resolve => setTimeout(resolve, 600));
      } catch (err) {
        errors.push(`Error generating signal for "${article.title}": ${String(err)}`);
      }
    }

    console.log(`[curate-weekly] Created ${signalsCreated} signals, ${errors.length} errors`);

    return NextResponse.json({
      ok: true,
      signals_created: signalsCreated,
      articles_processed: articlesToProcess.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[curate-weekly] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
