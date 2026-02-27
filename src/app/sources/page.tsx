import { createServiceClient } from '@/lib/supabase/server';
import type { Source } from '@/lib/supabase/types';
import SourcesClient from './SourcesClient';

export const dynamic = 'force-dynamic';

export default async function SourcesPage() {
  const supabase = createServiceClient();

  const { data: sources } = await supabase
    .from('sources')
    .select('*')
    .order('created_at', { ascending: true });

  const { data: latestArticles } = await supabase
    .from('articles')
    .select('source_id, ingested_at')
    .order('ingested_at', { ascending: false })
    .limit(200);

  const latestBySource: Record<string, string> = {};
  for (const a of latestArticles || []) {
    if (a.source_id && !latestBySource[a.source_id]) {
      latestBySource[a.source_id] = a.ingested_at;
    }
  }

  return <SourcesClient sources={(sources || []) as Source[]} latestBySource={latestBySource} />;
}
