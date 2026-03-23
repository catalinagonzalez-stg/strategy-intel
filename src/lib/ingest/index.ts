import { createServiceClient } from '@/lib/supabase/server';
import { fetchFeed, type ParsedEntry } from './rss';
import { classifyArticle } from '@/lib/ai/classify';

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
 * Ingest articles from a single RSS source:
 * 1. Fetch feed
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

  if (!source.url) {
    result.errors.push('No URL configured');
    return result;
  }

  if (source.type !== 'rss') {
    result.errors.push(`Source type "${source.type}" not yet supported natively`);
    return result;
  }

  // 1. Fetch feed
  const entries = await fetchFeed(source.url, source.name);
  result.fetched = entries.length;

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
          published_at: entry.published_at,
          status: 'new',
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
            classification_model: 'claude-sonnet-4-20250514',
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
