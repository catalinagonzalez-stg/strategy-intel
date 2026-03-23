import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateNewsletter, validateNewsletter } from '@/lib/ai/newsletter';

/**
 * POST /api/generate-newsletter
 *
 * Native newsletter generation pipeline (replaces n8n workflow):
 * 1. Creates a draft edition in newsletter_editions
 * 2. Fetches unassigned signals (where edition_id is null)
 * 3. Generates newsletter content using Claude AI
 * 4. Inserts newsletter_items
 * 5. Updates the edition with content and validation
 * 6. Updates signals with the edition_id
 */
export async function POST() {
  try {
    const supabase = createServiceClient();

    // 1. Fetch unassigned signals
    const { data: signals, error: signalsErr } = await supabase
      .from('signals')
      .select('*')
      .is('edition_id', null)
      .order('created_at', { ascending: false });

    if (signalsErr) {
      return NextResponse.json({ error: `Failed to fetch signals: ${signalsErr.message}` }, { status: 500 });
    }

    if (!signals || signals.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'No unassigned signals to build newsletter from. Run "Curate weekly" first.',
        edition_id: null,
      });
    }

    console.log(`[generate-newsletter] Found ${signals.length} unassigned signals`);

    // 2. Get next edition number
    const { data: lastEdition } = await supabase
      .from('newsletter_editions')
      .select('edition_number')
      .order('edition_number', { ascending: false })
      .limit(1)
      .single();

    const nextNumber = (lastEdition?.edition_number || 0) + 1;

    // 3. Create draft edition
    const { data: edition, error: editionErr } = await supabase
      .from('newsletter_editions')
      .insert({
        edition_date: new Date().toISOString().split('T')[0],
        edition_number: nextNumber,
        status: 'draft',
      })
      .select('id')
      .single();

    if (editionErr || !edition) {
      return NextResponse.json({ error: `Failed to create edition: ${editionErr?.message}` }, { status: 500 });
    }

    console.log(`[generate-newsletter] Created draft edition #${nextNumber} (${edition.id})`);

    // 4. Generate newsletter content with Claude
    const newsletterContent = await generateNewsletter(signals);

    // 5. Validate
    const validation = validateNewsletter(newsletterContent, signals.length);

    // 6. Insert newsletter_items for section assignments
    if (newsletterContent.section_assignments.length > 0) {
      const items = newsletterContent.section_assignments.map(sa => {
        const signal = signals.find((s: any) => s.id === sa.signal_id);
        return {
          edition_id: edition.id,
          signal_id: sa.signal_id || null,
          article_id: signal?.article_id || null,
          section: sa.section,
          sort_order: sa.sort_order,
          supporting_url: signal?.supporting_url || '',
          supporting_source: signal?.supporting_source || '',
          supporting_published_at: signal?.supporting_published_at || new Date().toISOString(),
          supporting_quote: signal?.supporting_quote || '',
          low_evidence: signal?.low_evidence || false,
        };
      });

      const { error: itemsErr } = await supabase
        .from('newsletter_items')
        .insert(items);

      if (itemsErr) {
        console.warn(`[generate-newsletter] Error inserting newsletter_items: ${itemsErr.message}`);
      }
    }

    // 7. Update edition with content
    const finalStatus = validation.valid ? 'validated' : 'draft';
    const { error: updateErr } = await supabase
      .from('newsletter_editions')
      .update({
        tema_semana: newsletterContent.tema_semana,
        content_md: newsletterContent.content_md,
        content_slack: newsletterContent.content_slack,
        validation_result: validation,
        status: finalStatus,
      })
      .eq('id', edition.id);

    if (updateErr) {
      console.error(`[generate-newsletter] Error updating edition: ${updateErr.message}`);
    }

    // 8. Update signals with edition_id
    const signalIds = signals.map((s: any) => s.id);
    const { error: signalUpdateErr } = await supabase
      .from('signals')
      .update({ edition_id: edition.id })
      .in('id', signalIds);

    if (signalUpdateErr) {
      console.warn(`[generate-newsletter] Error updating signal edition_ids: ${signalUpdateErr.message}`);
    }

    console.log(`[generate-newsletter] Edition #${nextNumber} generated. Status: ${finalStatus}. Validation: ${validation.valid ? 'PASS' : 'FAIL'}`);

    return NextResponse.json({
      ok: true,
      edition_id: edition.id,
      edition_number: nextNumber,
      status: finalStatus,
      tema_semana: newsletterContent.tema_semana,
      signals_count: signals.length,
      validation,
    });
  } catch (error) {
    console.error('[generate-newsletter] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
