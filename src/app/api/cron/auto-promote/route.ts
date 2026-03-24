import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { FINTOC_CONTEXT } from '@/lib/fintoc-context';

/**
 * POST /api/cron/auto-promote
 * 
 * Automatically promotes high-relevance articles from priority regions (CL, MX)
 * to signal status. Runs after ingestion to ensure the best content is flagged
 * for newsletter inclusion without manual intervention.
 * 
 * Promotion criteria:
 * - relevance_score >= 7 for CL/MX articles
 * - relevance_score >= 8 for other LATAM regions
 * - relevance_score >= 9 for global articles
 * - Article must be in 'new' status
 * - Article must have is_weekly_eligible = true
 * - Article must be published within the last 10 days
 */
export async function POST(request: Request) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
        const supabase = createServiceClient();
        const primaryRegions = FINTOC_CONTEXT.regions_by_priority.primary;
        const secondaryRegions = FINTOC_CONTEXT.regions_by_priority.secondary;

      // Only evaluate articles published in the last 10 days to ensure freshness
      const freshnessCutoff = new Date();
      freshnessCutoff.setDate(freshnessCutoff.getDate() - 10);

      const { data: articles } = await supabase
          .from('articles')
          .select('id, title, status, published_at, classifications(*)')
          .eq('status', 'new')
          .gte('published_at', freshnessCutoff.toISOString())
          .order('ingested_at', { ascending: false })
          .limit(200);

      if (!articles || articles.length === 0) {
              return NextResponse.json({ message: 'No new articles to evaluate', promoted: 0 });
      }

      const toPromote: string[] = [];
        const allCompetitors = [
                ...FINTOC_CONTEXT.competitors.direct.chile,
                ...FINTOC_CONTEXT.competitors.direct.mexico,
                ...FINTOC_CONTEXT.competitors.direct.latam,
              ];

      for (const article of articles) {
              const classifications = article.classifications as Array<{
                        relevance_score: number;
                        region: string;
                        is_weekly_eligible: boolean;
                        topics: string[];
              }>;

          if (!classifications || classifications.length === 0) continue;
              const topClass = classifications[0];
              if (!topClass.is_weekly_eligible) continue;

          const region = topClass.region;
              const score = topClass.relevance_score;
              const topics = topClass.topics || [];

          const mentionsCompetitor = allCompetitors.some(c => 
                                                                 article.title?.toLowerCase().includes(c.toLowerCase())
                                                               );
              const isCriticalTopic = topics.some(t => 
                                                          (FINTOC_CONTEXT.topics_by_relevance.critical as readonly string[]).includes(t)
                                                        );

          let shouldPromote = false;

          if ((primaryRegions as readonly string[]).includes(region)) {
                    shouldPromote = score >= 7;
          } else if ((secondaryRegions as readonly string[]).includes(region)) {
                    shouldPromote = score >= 8;
          } else {
                    shouldPromote = score >= 9;
          }

          if (!shouldPromote && mentionsCompetitor && isCriticalTopic && score >= 6) {
                    shouldPromote = true;
          }

          if (shouldPromote) toPromote.push(article.id);
      }

      if (toPromote.length > 0) {
              await supabase
                .from('articles')
                .update({ status: 'promoted' })
                .in('id', toPromote);
      }

      console.log(`[cron/auto-promote] Evaluated ${articles.length}, promoted ${toPromote.length}`);

      return NextResponse.json({
              success: true,
              evaluated: articles.length,
              promoted: toPromote.length,
              promoted_ids: toPromote,
              timestamp: new Date().toISOString(),
      });
  } catch (error) {
        console.error('[cron/auto-promote] Error:', error);
        return NextResponse.json(
          { error: 'Auto-promote failed', details: String(error) },
          { status: 500 }
              );
  }
}

export async function GET(request: Request) {
    return POST(request);
}
