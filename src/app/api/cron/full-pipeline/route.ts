import { NextResponse } from 'next/server';

/**
 * POST /api/cron/full-pipeline
 *
 * Orchestrates the complete weekly newsletter pipeline:
 *   1. Ingest RSS feeds
 *   2. Auto-promote high-relevance articles
 *   3. Curate weekly signals from promoted articles
 *   4. Generate newsletter from signals
 *   5. Send to Slack (only if newsletter is validated)
 *
 * Designed to be called by an external cron service (e.g. cron-job.org)
 * every Monday at 7:00 AM CLT.
 *
 * Auth: Bearer CRON_SECRET
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    || process.env.RENDER_EXTERNAL_URL
    || 'https://strategy-intel.onrender.com';

  const results: Record<string, any> = {};
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
  };

  try {
    // Step 1: Ingest RSS feeds
    console.log('[full-pipeline] Step 1: Ingesting RSS feeds...');
    try {
      const ingestRes = await fetch(`${baseUrl}/api/cron/ingest`, {
        method: 'POST',
        headers,
      });
      results.ingest = await ingestRes.json();
      console.log(`[full-pipeline] Ingest: ${JSON.stringify(results.ingest).substring(0, 200)}`);
    } catch (err) {
      results.ingest = { error: String(err) };
      console.error('[full-pipeline] Ingest failed:', err);
    }

    // Step 2: Auto-promote
    console.log('[full-pipeline] Step 2: Auto-promoting articles...');
    try {
      const promoteRes = await fetch(`${baseUrl}/api/cron/auto-promote`, {
        method: 'POST',
        headers,
      });
      results.auto_promote = await promoteRes.json();
      console.log(`[full-pipeline] Auto-promote: promoted ${results.auto_promote.promoted || 0}`);
    } catch (err) {
      results.auto_promote = { error: String(err) };
      console.error('[full-pipeline] Auto-promote failed:', err);
    }

    // Step 3: Curate weekly signals
    console.log('[full-pipeline] Step 3: Curating weekly signals...');
    try {
      const curateRes = await fetch(`${baseUrl}/api/curate-weekly`, {
        method: 'POST',
        headers,
      });
      results.curate_weekly = await curateRes.json();
      console.log(`[full-pipeline] Curate: ${results.curate_weekly.signals_created || 0} signals created`);
    } catch (err) {
      results.curate_weekly = { error: String(err) };
      console.error('[full-pipeline] Curate failed:', err);
    }

    // Step 4: Generate newsletter
    console.log('[full-pipeline] Step 4: Generating newsletter...');
    try {
      const genRes = await fetch(`${baseUrl}/api/generate-newsletter`, {
        method: 'POST',
        headers,
      });
      results.generate_newsletter = await genRes.json();
      console.log(`[full-pipeline] Newsletter: edition #${results.generate_newsletter.edition_number}, status: ${results.generate_newsletter.status}`);
    } catch (err) {
      results.generate_newsletter = { error: String(err) };
      console.error('[full-pipeline] Newsletter generation failed:', err);
    }

    // Step 5: Send to Slack (only if newsletter was validated)
    const editionId = results.generate_newsletter?.edition_id;
    const status = results.generate_newsletter?.status;

    if (editionId && status === 'validated') {
      console.log('[full-pipeline] Step 5: Sending to Slack...');
      try {
        const slackRes = await fetch(`${baseUrl}/api/send-slack`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ edition_id: editionId }),
        });
        results.send_slack = await slackRes.json();
        console.log(`[full-pipeline] Slack: sent (${results.send_slack.chars} chars)`);
      } catch (err) {
        results.send_slack = { error: String(err) };
        console.error('[full-pipeline] Slack send failed:', err);
      }
    } else {
      results.send_slack = {
        skipped: true,
        reason: !editionId
          ? 'No edition generated'
          : `Edition status is "${status}", not "validated"`,
      };
      console.log(`[full-pipeline] Step 5: Skipped Slack — ${results.send_slack.reason}`);
    }

    console.log('[full-pipeline] Pipeline complete.');

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error('[full-pipeline] Fatal error:', error);
    return NextResponse.json(
      { error: 'Pipeline failed', details: String(error), partial_results: results },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
