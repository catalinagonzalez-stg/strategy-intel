import { createServiceClient } from '@/lib/supabase/server';
import type { NewsletterEdition, NewsletterItem, Signal } from '@/lib/supabase/types';
import CurationClient from './CurationClient';

export const dynamic = 'force-dynamic';

export default async function CurationPage() {
  const supabase = createServiceClient();

  const { data: editions } = await supabase
    .from('newsletter_editions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  const currentEdition = (editions?.[0] as NewsletterEdition) || null;

  let items: NewsletterItem[] = [];
  let signals: Signal[] = [];

  if (currentEdition) {
    const { data: itemsData } = await supabase
      .from('newsletter_items')
      .select('*')
      .eq('edition_id', currentEdition.id)
      .order('sort_order', { ascending: true });
    items = (itemsData || []) as NewsletterItem[];

    const { data: signalsData } = await supabase
      .from('signals')
      .select('*')
      .eq('edition_id', currentEdition.id);
    signals = (signalsData || []) as Signal[];
  }

  const { data: unassigned } = await supabase
    .from('signals')
    .select('*')
    .is('edition_id', null)
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <CurationClient
      edition={currentEdition}
      items={items}
      signals={signals}
      unassignedSignals={(unassigned || []) as Signal[]}
    />
  );
}
