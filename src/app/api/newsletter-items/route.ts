import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const editionId = req.nextUrl.searchParams.get('edition_id');
  if (!editionId) return NextResponse.json([], { status: 400 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('newsletter_items')
    .select('*')
    .eq('edition_id', editionId)
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data || []);
}
