import { createServiceClient } from '@/lib/supabase/server';
import type { Article, Classification } from '@/lib/supabase/types';
import FeedClient from './FeedClient';

export const dynamic = 'force-dynamic';

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; topic?: string; status?: string; minScore?: string }>;
}) {
  const params = await searchParams;
  const supabase = createServiceClient();

  let query = supabase
    .from('articles')
    .select('*, classifications(*)')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(100);

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status);
  }

  const { data: articles, error } = await query;

  if (error) {
    return <div className="p-8 text-red-500">Error loading articles: {error.message}</div>;
  }

  const typed = (articles || []) as (Article & { classifications: Classification[] })[];

  let filtered = typed;
  if (params.region) {
    filtered = filtered.filter(a =>
      a.classifications?.some(c => c.region === params.region)
    );
  }
  if (params.topic) {
    filtered = filtered.filter(a =>
      a.classifications?.some(c => c.topics?.includes(params.topic as never))
    );
  }
  if (params.minScore) {
    const min = parseInt(params.minScore);
    filtered = filtered.filter(a =>
      a.classifications?.some(c => c.relevance_score >= min)
    );
  }

  return <FeedClient articles={filtered} />;
}
