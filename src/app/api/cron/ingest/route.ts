import { NextResponse } from 'next/server';
import { triggerN8n } from '@/lib/n8n/trigger';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * POST /api/cron/ingest
 * 
 * Triggers the n8n ingestion workflow to fetch new articles from all active sources.
 * Designed to be called by an external cron service (e.g., cron-job.org, Render cron)
 * on a daily schedule.
 * 
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
        const supabase = createServiceClient();

      // Get all active sources
      const { data: sources } = await supabase
          .from('sources')
          .select('id, name, type, url')
          .eq('active', true);

      if (!sources || sources.length === 0) {
              return NextResponse.json({ message: 'No active sources to ingest' });
      }

      // Trigger n8n ingestion webhook
      const result = await triggerN8n('ingest-sources', {
              sources,
              triggered_by: 'cron',
              timestamp: new Date().toISOString(),
      });

      // Log the ingestion run
      console.log(`[cron/ingest] Triggered ingestion for ${sources.length} sources`);

      return NextResponse.json({
              success: true,
              sources_count: sources.length,
              n8n_response: result,
              timestamp: new Date().toISOString(),
      });
  } catch (error) {
        console.error('[cron/ingest] Error:', error);
        return NextResponse.json(
          { error: 'Ingestion trigger failed', details: String(error) },
          { status: 500 }
              );
  }
}

// Also support GET for simple health checks / manual triggers
export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Redirect to POST behavior
  return POST(request);
}
