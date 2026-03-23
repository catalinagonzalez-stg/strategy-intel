import { NextResponse } from 'next/server';
import { ingestAllSources } from '@/lib/ingest';

/**
 * POST /api/cron/ingest
 *
 * Runs the full ingestion pipeline natively:
 * 1. Fetches RSS feeds from all active sources
 * 2. Deduplicates by content_hash
 * 3. Inserts new articles into Supabase
 * 4. Classifies each article with Claude AI
 * 5. Inserts classifications into Supabase
 *
 * Designed to be called by an external cron service on a daily schedule.
 * Security: Uses CRON_SECRET header to authenticate requests.
 */
export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[cron/ingest] Starting native ingestion pipeline');

    const result = await ingestAllSources();

    console.log(`[cron/ingest] Complete: ${result.total_fetched} fetched, ${result.total_new} new, ${result.total_classified} classified`);

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[cron/ingest] Error:', error);
    return NextResponse.json(
      { error: 'Ingestion failed', details: String(error) },
      { status: 500 }
    );
  }
}

// Also support GET for simple health checks / manual triggers
export async function GET(request: Request) {
  return POST(request);
}
