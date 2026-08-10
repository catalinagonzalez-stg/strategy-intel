import { createServiceClient } from '@/lib/supabase/server';
import { fetchFeed, type ParsedEntry } from './rss';
import { fetchSerperNews } from './serper';
import { fetchSlackLinks } from './slack';
import { classifyArticle } from '@/lib/ai/classify';
import { DEFAULT_MODEL } from '@/lib/ai/client';

interface Source {
  id: string;
  name: string;
  type: string;
  url: string | null;
}

interface IngestResult {
  source_id: string;
  source_name: string;
  fetched: number;
  new_articles: number;
  classified: number;
  errors: string[];
}

/**
 * Ingest articles from a single source (RSS or Serper):
 * 1. Fetch feed / search news
 * 2. Deduplicate by content_hash
 * 3. Insert new articles
 * 4. Classify each new article with Claude
 * 5. Insert classifications
 */
async function ingestSource(source: Source): Promise<IngestResult> {
  const result: IngestResult = {
    source_id: source.id,
    source_name: source.name,
    fetched: 0,
    new_articles: 0,
    classified: 0,
    errors: [],
  };

  if (!source.url && source.type === 'rss') {
    result.errors.push('No URL configured');
    return result;
  }

  if (source.type !== 'rss' && source.type !== 'serper' && source.type !== 'slack') {
    result.errors.push(`Source type "${source.type}" not yet supported natively`);
    return result;
  }

  // 1. Fetch entries based on source type
  let entries: ParsedEntry[];
  if (source.type === 'serper') {
    entries = await fetchSerperNews(source.name, source.url);
  } else if (source.type === 'slack') {
    // Channel ID from the source url if it looks like one, else the env default
    const channelId = source.url?.match(/[CG][A-Z0-9]{8,}/)?.[0] || process.env.SLACK_CHANNEL_ID;
    if (!channelId) throw new Error('No Slack channel ID configured (source url or SLACK_CHANNEL_ID)');
    entries = await fetchSlackLinks(channelId);
  } else {
    entries = await fetchFeed(source.url!, source.name);
  }
  result.fetched = entries.length;

  // Drop event pages and future-dated items: a webinar dated next month would
  // otherwise score as maximally fresh and compete for the newsletter.
  const maxPublishedAt = Date.now() + 24 * 60 * 60 * 1000;
  const validEntries = entries.filter(e => {
    if (e.url && e.url.includes('/event-info/')) return false;
    if (e.published_at && new Date(e.published_at).getTime() > maxPublishedAt) return false;
    return true;
  });
  if (validEntries.length < entries.length) {
    console.log(`[ingest] ${source.name}: dropped ${entries.length - validEntries.length} event/future-dated entries`);
  }
  entries = validEntries;

  if (entries.length === 0) return result;

  const supabase = createServiceClient();

  // 2. Check which entries already exist (by content_hash)
  const hashes = entries.map(e => e.content_hash);
  const { data: existingArticles } = await supabase
    .from('articles')
    .select('content_hash')
    .in('content_hash', hashes);

  const existingHashes = new Set((existingArticles || []).map((a: { content_hash: string }) => a.content_hash));
  const newEntries = entries.filter(e => !existingHashes.has(e.content_hash));

  if (newEntries.length === 0) {
    console.log(`[ingest] ${source.name}: ${entries.length} entries, all already exist`);
    return result;
  }

  console.log(`[ingest] ${source.name}: ${entries.length} entries, ${newEntries.length} new`);

  // 3. Insert new articles and classify them
  for (const entry of newEntries) {
    try {
      // Insert article
      const { data: article, error: insertErr } = await supabase
        .from('articles')
        .insert({
          source_id: source.id,
          title: entry.title,
          url: entry.url || null,
          author: entry.author,
          source_domain: entry.source_domain,
          content_snippet: entry.content_snippet,
          content_text: entry.content_text,
          content_hash: entry.content_hash,
          published_at: entry.published_at || new Date().toISOString(),
          // Slack links were already curated by a human — straight to promoted
          status: source.type === 'slack' ? 'promoted' : 'new',
          pinned: false,
        })
        .select('id')
        .single();

      if (insertErr || !article) {
        result.errors.push(`Insert error for "${entry.title}": ${insertErr?.message || 'unknown'}`);
        continue;
      }

      result.new_articles++;

      // 4. Classify with Claude
      try {
        const classification = await classifyArticle({
          title: entry.title,
          content_snippet: entry.content_snippet,
          content_text: entry.content_text,
          url: entry.url,
          source_domain: entry.source_domain,
          published_at: entry.published_at,
        });

        // 5. Insert classification
        const { error: classErr } = await supabase
          .from('classifications')
          .insert({
            article_id: article.id,
            relevance_score: classification.relevance_score,
            topics: classification.topics,
            region: classification.region,
            bucket: classification.bucket,
            summary: classification.summary,
            evidence_quote: classification.evidence_quote,
            why_relevant_to_fintoc: classification.why_relevant_to_fintoc,
            confidence: classification.confidence,
            freshness_days: classification.freshness_days,
            is_weekly_eligible: classification.is_weekly_eligible,
            classification_model: DEFAULT_MODEL,
          });

        if (classErr) {
          result.errors.push(`Classification insert error for "${entry.title}": ${classErr.message}`);
        } else {
          result.classified++;
        }
      } catch (classifyError) {
        result.errors.push(`Classification error for "${entry.title}": ${String(classifyError)}`);
      }

      // Small delay between articles to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (err) {
      result.errors.push(`Error processing "${entry.title}": ${String(err)}`);
    }
  }

  return result;
}

/**
 * Run full ingestion pipeline for all active sources.
 */
export async function ingestAllSources(): Promise<{
  results: IngestResult[];
  total_fetched: number;
  total_new: number;
  total_classified: number;
}> {
  const supabase = createServiceClient();

  // Get all active sources
  const { data: sources, error } = await supabase
    .from('sources')
    .select('id, name, type, url')
    .eq('active', true);

  if (error || !sources || sources.length === 0) {
    console.log('[ingest] No active sources found');
    return { results: [], total_fetched: 0, total_new: 0, total_classified: 0 };
  }

  console.log(`[ingest] Starting ingestion for ${sources.length} sources`);

  const results: IngestResult[] = [];

  // Process sources sequentially to control API rate
  for (const source of sources) {
    try {
      const result = await ingestSource(source as Source);
      results.push(result);
      console.log(`[ingest] ${source.name}: fetched=${result.fetched}, new=${result.new_articles}, classified=${result.classified}`);
    } catch (err) {
      console.error(`[ingest] ${source.name} FAILED: ${String(err)}`);
      results.push({
        source_id: source.id,
        source_name: source.name,
        fetched: 0,
        new_articles: 0,
        classified: 0,
        errors: [String(err)],
      });
    }
  }

  return {
    results,
    total_fetched: results.reduce((sum, r) => sum + r.fetched, 0),
    total_new: results.reduce((sum, r) => sum + r.new_articles, 0),
    total_classified: results.reduce((sum, r) => sum + r.classified, 0),
  };
}
