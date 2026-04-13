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

    // 1. Fetch unassigned signals (only those published in the last 10 days — older ones are stale)
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const cutoffIso = tenDaysAgo.toISOString();

    const { data: allSignals, error: signalsErr } = await supabase
      .from('signals')
      .select('*')
      .is('edition_id', null)
      .order('created_at', { ascending: false });

    if (signalsErr) {
      return NextResponse.json({ error: `Failed to fetch signals: ${signalsErr.message}` }, { status: 500 });
    }

    if (!allSignals || allSignals.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'No unassigned signals to build newsletter from. Run "Curate weekly" first.',
        edition_id: null,
      });
    }

    // Filter: only signals published in the last 10 days go to the LLM.
    // Stale signals still get assigned to this edition so they stop appearing as "unassigned",
    // but they don't influence newsletter content.
    const signals = allSignals.filter((s: any) => {
      if (!s.supporting_published_at) return true;
      return s.supporting_published_at >= cutoffIso;
    });
    const staleSignalIds = allSignals
      .filter((s: any) => !signals.find((x: any) => x.id === s.id))
      .map((s: any) => s.id);

    console.log(`[generate-newsletter] Found ${allSignals.length} unassigned signals (${signals.length} fresh <=10d, ${staleSignalIds.length} stale dropped)`);

    if (signals.length === 0) {
      return NextResponse.json({
        ok: true,
        message: `No fresh signals (<=10 days old). ${staleSignalIds.length} stale signals skipped.`,
        edition_id: null,
      });
    }

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
    // The LLM may return signal_ids that don't exactly match (truncated, etc.)
    // So we match by finding the closest signal, and skip unmatched assignments.
    // Also: coerce LLM-invented section names to the valid enum to avoid the
    // newsletter_items_section_check constraint silently rejecting inserts.
    const VALID_SECTIONS = new Set(['que_paso', 'implicancia_fintoc', 'competencia', 'regulacion', 'tendencias']);
    const coerceSection = (sec: string, signalType: string | null) => {
      if (VALID_SECTIONS.has(sec)) return sec;
      // Common LLM mistakes — map to closest valid section
      if (sec === 'tendencia' || sec === 'tendencies' || sec === 'trend' || sec === 'trends') return 'tendencias';
      if (sec === 'radar' || sec === 'competition' || sec === 'competidores') return 'competencia';
      if (sec === 'regulation' || sec === 'compliance') return 'regulacion';
      if (sec === 'summary' || sec === 'resumen' || sec === 'que_pasa') return 'que_paso';
      if (sec === 'fintoc' || sec === 'implicancia') return 'implicancia_fintoc';
      // Fallback by signal type
      if (signalType === 'competition') return 'competencia';
      if (signalType === 'regulation') return 'regulacion';
      return 'tendencias';
    };

    if (newsletterContent.section_assignments.length > 0) {
      const items = newsletterContent.section_assignments
        .map(sa => {
          // Try exact match first, then prefix match (LLM sometimes truncates UUIDs)
          let signal = signals.find((s: any) => s.id === sa.signal_id);
          if (!signal) {
            signal = signals.find((s: any) => s.id.startsWith(sa.signal_id) || sa.signal_id.startsWith(s.id));
          }
          if (!signal) {
            console.warn(`[generate-newsletter] No matching signal for assignment: ${sa.signal_id}`);
            return null;
          }
          const safeSection = coerceSection(sa.section, signal.signal_type);
          if (safeSection !== sa.section) {
            console.warn(`[generate-newsletter] Coerced invalid section "${sa.section}" -> "${safeSection}"`);
          }
          return {
            edition_id: edition.id,
            signal_id: signal.id, // Use the actual signal ID, not the LLM's version
            article_id: signal.article_id || null,
            section: safeSection,
            sort_order: sa.sort_order,
            editorial_text: signal.summary_factual + (signal.fintoc_implication ? ` — ${signal.fintoc_implication}` : ''),
            supporting_url: signal.supporting_url || '',
            supporting_source: signal.supporting_source || '',
            supporting_published_at: signal.supporting_published_at || new Date().toISOString(),
            supporting_quote: signal.supporting_quote || '',
            low_evidence: signal.low_evidence || false,
          };
        })
        .filter(Boolean); // Remove null entries from unmatched signals

      if (items.length > 0) {
        const { error: itemsErr } = await supabase
          .from('newsletter_items')
          .insert(items);

        if (itemsErr) {
          console.warn(`[generate-newsletter] Error inserting newsletter_items: ${itemsErr.message}`);
        } else {
          console.log(`[generate-newsletter] Inserted ${items.length} newsletter_items`);
        }
      }

      // Also insert items for signals NOT assigned by the LLM (to ensure all signals appear).
      // Using only valid section IDs from the enum.
      const assignedSignalIds = new Set(items.map((it: any) => it?.signal_id));
      const unassignedItems = signals
        .filter((s: any) => !assignedSignalIds.has(s.id))
        .map((s: any, idx: number) => ({
          edition_id: edition.id,
          signal_id: s.id,
          article_id: s.article_id || null,
          section: coerceSection('', s.signal_type),
          sort_order: 100 + idx,
          editorial_text: s.summary_factual + (s.fintoc_implication ? ` — ${s.fintoc_implication}` : ''),
          supporting_url: s.supporting_url || '',
          supporting_source: s.supporting_source || '',
          supporting_published_at: s.supporting_published_at || new Date().toISOString(),
          supporting_quote: s.supporting_quote || '',
          low_evidence: s.low_evidence || false,
        }));

      if (unassignedItems.length > 0) {
        const { error: unassignedErr } = await supabase
          .from('newsletter_items')
          .insert(unassignedItems);

        if (unassignedErr) {
          console.warn(`[generate-newsletter] Error inserting unassigned items: ${unassignedErr.message}`);
        } else {
          console.log(`[generate-newsletter] Inserted ${unassignedItems.length} unassigned signal items`);
        }
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

    // 8. Update signals with edition_id (both fresh and stale, so stale ones don't pile up)
    const signalIds = [...signals.map((s: any) => s.id), ...staleSignalIds];
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
