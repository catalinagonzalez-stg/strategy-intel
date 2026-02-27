import { createServiceClient } from '@/lib/supabase/server';
import type { NewsletterEdition } from '@/lib/supabase/types';
import HistoryClient from './HistoryClient';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const supabase = createServiceClient();

  const { data: editions } = await supabase
    .from('newsletter_editions')
    .select('*')
    .order('edition_date', { ascending: false })
    .limit(50);

  return <HistoryClient editions={(editions || []) as NewsletterEdition[]} />;
}
