import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import type { ArticleStatus } from '@/lib/supabase/types';

const VALID_STATUSES: ArticleStatus[] = ['new', 'promoted', 'excluded', 'noise'];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { articleId, status, excluded_reason, pinned, notes } = body;

    if (!articleId) {
      return NextResponse.json({ error: 'articleId is required' }, { status: 400 });
    }

    // Build the update object
    const updates: Record<string, unknown> = {};

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.status = status;
    }

    if (excluded_reason !== undefined) updates.excluded_reason = excluded_reason;
    if (pinned !== undefined) updates.pinned = pinned;
    if (notes !== undefined) updates.notes = notes;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from('articles')
      .update(updates)
      .eq('id', articleId);

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Promote API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
