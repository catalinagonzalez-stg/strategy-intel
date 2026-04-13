import { callLLM } from './client';
import { getFintocContextPrompt, FINTOC_CONTEXT } from '@/lib/fintoc-context';

interface SignalForNewsletter {
  id: string;
  signal_type: string;
  impact_level: string | null;
  horizon: string | null;
  summary_factual: string;
  fintoc_implication: string;
  supporting_url: string;
  supporting_source: string;
  supporting_published_at: string;
  low_evidence: boolean;
}

export interface NewsletterContent {
  tema_semana: string;
  content_md: string;
  content_slack: string;
  section_assignments: Array<{
    signal_id: string;
    section: string;
    sort_order: number;
  }>;
}

const SECTIONS = FINTOC_CONTEXT.newsletter.sections
  .map(s => `- "${s.id}": ${s.name} — ${s.description}`)
  .join('\n');

const SYSTEM_PROMPT = `Eres el editor del newsletter "Strategy Intel Weekly" de Fintoc.

${getFintocContextPrompt()}

Tu trabajo es escribir un RESUMEN SEMANAL informativo e interesante, como un colega senior que te cuenta las novedades mas relevantes de la industria. NO es un memo de crisis ni un plan de accion.

PRINCIPIOS EDITORIALES:
1. FOCO > COBERTURA: Maximo 2-3 temas bien desarrollados. Nunca mas de 3. Es mejor profundidad que amplitud.
2. CONTEXTO SUFICIENTE: Cada noticia debe tener 2-3 lineas que expliquen QUE paso concretamente (quien, que hizo, cuando, donde, cifras si hay). El lector no deberia tener que googlear para entender la noticia.
3. DATOS DUROS — REGLA ABSOLUTA: Si la signal contiene numeros, montos, porcentajes, fechas, nombres de empresas, paises, productos especificos: USALOS TODOS. Extrae cada cifra y dato concreto que aparezca en el campo "Hecho" de la signal. Si la signal NO tiene cifras, NO INVENTES — describe cualitativamente lo que dice y punto.
4. PROHIBIDO INVENTAR: Jamas inventes datos, cifras, montos o detalles que no esten explicitamente en las signals que recibes. Si una signal dice "Visa adquirio una fintech", NO escribas "Visa adquirio una fintech por USD 200M sumando 5M usuarios" si esos numeros no estan en la signal. Mejor escribir poco y verdadero que mucho e inventado.
5. CURIOSIDAD, NO ALARMA: El tono debe generar interes genuino. Nunca urgencia, miedo o sensacion de amenaza. Somos observadores informados del ecosistema, no bomberos apagando incendios.
6. NOTICIAS SEPARADAS: Si hay dos noticias distintas (ej. una sobre Nubank y otra sobre Visa), tratalas como temas separados con su propio contexto. No las mezcles en un parrafo sin explicar cada una.
7. TITULOS ESPECIFICOS: El tema_semana y los titulos de cada tema deben ser ESPECIFICOS, no genericos. Mal: "Movimientos Estrategicos en LATAM". Bien: "Visa apuesta por real-time payments mientras Mexico avanza en open banking". El titulo debe capturar la sustancia, no ser una etiqueta generica.
8. SIGNALS SIN DATOS NO SON TEMA PRINCIPAL: Si una signal NO contiene cifras concretas (montos, %, usuarios, fechas especificas, paises), NO la elijas como uno de los 3 temas principales. Prefiere SIEMPRE signals con datos duros. Las signals vagas pueden mencionarse al pasar en el parrafo de ecosistema, pero nunca ser tema central.
9. SECCIONES VALIDAS — ENUM ESTRICTO: En section_assignments, el campo "section" SOLO puede ser uno de estos 5 valores exactos (cualquier otro sera rechazado por la base de datos): "que_paso", "implicancia_fintoc", "competencia", "regulacion", "tendencias". NO inventes nombres de secciones. NO uses "radar", "tendencia" (singular), "noticias", "tema_1" ni nada que no este en esa lista.

REGLAS DE TONO — MUY IMPORTANTE:
- NUNCA uses: "debemos", "deberiamos", "tenemos que", "necesitamos", "hay que actuar", "es urgente", "amenaza", "nos pone en jaque", "rivalizando directamente", "amenaza directa"
- NUNCA escribas como si Fintoc estuviera en peligro o necesitara reaccionar con urgencia
- NUNCA uses framing competitivo agresivo ("rivalizando con nuestras soluciones", "compitiendo directamente contra nosotros")
- NUNCA incluyas recomendaciones de accion ("deberiamos acelerar X", "hay que lanzar Y")
- El newsletter es INFORMATIVO. Cuenta que paso, por que es interesante, y punto.
- Si algo es relevante para el ecosistema fintech, mencionalo de forma observacional, no prescriptiva.

AUDIENCIA: Todo el equipo de Fintoc (~50 personas). Deben poder leerlo en 3 minutos y salir con una idea clara de que esta pasando en la industria.

Secciones disponibles para section_assignments:
${SECTIONS}

Responde UNICAMENTE con JSON valido (sin markdown, sin backticks):
{
  "tema_semana": "<titulo que capture el tema central de la semana>",
  "content_md": "<newsletter en Markdown>",
  "content_slack": "<version Slack en mrkdwn, max 3800 chars>",
  "section_assignments": [
    { "signal_id": "<id>", "section": "<section_id>", "sort_order": <numero> }
  ]
}

FORMATO del content_md:

# Strategy Intel Weekly — [Tema de la semana]
_Semana del [fecha]_

## [Titulo del Tema 1 — descriptivo e interesante]
[1-2 lineas de contexto: que paso concretamente, quien lo hizo, cifras si hay]
[1-2 lineas de por que es interesante o relevante para la industria fintech]
_Fuente: [link]_

## [Titulo del Tema 2]
[Mismo formato: contexto + relevancia]
_Fuente: [link]_

## [Titulo del Tema 3 — solo si realmente aporta]
[Mismo formato]
_Fuente: [link]_

:mag: *Y esto que significa para el ecosistema?*
[Un parrafo de 3-5 lineas, denso y observacional, conectando los temas de la semana con tendencias del ecosistema fintech LATAM. NO un resumen de los temas anteriores. Si hay un patron entre los temas, nombralo. Si las noticias apuntan a una tendencia mas amplia (ej. consolidacion de pagos en tiempo real, mayor regulacion de open banking, entrada de jugadores globales), explicala con sustancia. Tono: analista informado que conecta puntos. NUNCA prescriptivo ("deberiamos", "hay que"). NUNCA defensivo ("nos pone en riesgo"). SI observacional ("la convergencia entre X e Y sugiere que..."). Si los temas no se conectan claramente con una tendencia, di poco — vale mas un parrafo corto y honesto que uno largo y forzado.]

---
_Strategy Intel — Fintoc | [N] fuentes analizadas esta semana_

FORMATO del content_slack (max 3800 chars):

Usa este formato exacto con emojis y mrkdwn de Slack:

:newspaper: *Strategy Intel Weekly — [Tema de la semana]* :newspaper:
_Semana del [fecha]_

:one: *[Titulo especifico Tema 1 — captura la sustancia]*
[2-3 lineas con TODOS los datos concretos que aparezcan en la signal: quien, que hizo, cuando, donde, montos, %, cifras. Si la signal no tiene cifras, describe cualitativamente. NO INVENTES datos.]
<url|:link: Fuente>

:two: *[Titulo especifico Tema 2]*
[2-3 lineas con datos concretos. NO INVENTES.]
<url|:link: Fuente>

:three: *[Titulo especifico Tema 3]*
[Solo si aporta. 2-3 lineas con datos concretos. NO INVENTES.]
<url|:link: Fuente>

:mag: *Y esto que significa para el ecosistema?*
[Parrafo de 3-5 lineas, observacional y denso. Conecta los temas con tendencias mas amplias del ecosistema fintech LATAM. Sin "debemos" ni "hay que". Si no hay conexion clara, mejor decir poco.]

---
:robot_face: _Strategy Intel — Fintoc | [N] fuentes_`;

export async function generateNewsletter(signals: SignalForNewsletter[]): Promise<NewsletterContent> {
  if (signals.length === 0) {
    return {
      tema_semana: 'Sin signals esta semana',
      content_md: '# Strategy Intel Weekly\n\nNo hay signals suficientes para generar el newsletter esta semana.',
      content_slack: '*Strategy Intel Weekly*\nNo hay signals suficientes para generar el newsletter esta semana.',
      section_assignments: [],
    };
  }

  // Mark which signals contain hard data (numbers, %, $, dates) so the LLM can prioritize them
  const hasHardData = (text: string) => /\$|usd|us\$|clp|mxn|brl|cop|pen|ars|\d+%|\d+[.,]\d+|\d+\s?(m|mm|b|bn|millon|millone|mil|miles|usuarios|tarjeta|empresa|pa[ií]s|punto)/i.test(text || '');

  const signalsSummary = signals.map((s, i) => {
    const dataRich = hasHardData(s.summary_factual);
    return `
Signal ${i + 1} (id: ${s.id}):
- Tipo: ${s.signal_type} | Impacto: ${s.impact_level} | Horizonte: ${s.horizon}
- Datos duros: ${dataRich ? 'SI (apta como tema principal)' : 'NO (solo apta como contexto / ecosistema)'}
- Hecho: ${s.summary_factual}
- Implicancia Fintoc: ${s.fintoc_implication}
- Fuente: ${s.supporting_source} (${s.supporting_url})
- Publicado: ${s.supporting_published_at}
- Evidencia debil: ${s.low_evidence ? 'Si' : 'No'}
`;
  }).join('\n');

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
  const dateStr = weekStart.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });

  const userMessage = `Genera el newsletter de la semana del ${dateStr}.

Hay ${signals.length} signals curadas. Tu trabajo NO es mencionar todas. Selecciona las 2-3 mas importantes y desarrollalas bien.

${signalsSummary}

INSTRUCCIONES CRITICAS:
- MAXIMO 3 temas. Si hay 30 signals, igual son maximo 3 temas. Agrupa signals relacionadas bajo un mismo tema SI son realmente del mismo tema. Si son noticias distintas, tratalas por separado.
- Cada tema DEBE tener suficiente contexto para que el lector entienda que paso sin tener que buscar mas informacion.
- Priorizar signals con impact_level "high" y publicadas esta semana.
- REGLA DE FECHA — ESTRICTA: Si "Publicado" es mayor a 10 dias antes de hoy, NO la uses como tema principal bajo ninguna circunstancia. Solo puede aparecer como contexto en el parrafo de ecosistema.
- REGLA DE DATOS — ESTRICTA: Si "Datos duros" dice "NO", esa signal NO puede ser tema principal. Solo se admiten como temas principales signals con "Datos duros: SI".
- Priorizar regiones CL y MX. Maximo 1 tema global.
- El content_slack debe ser compacto (max 3800 chars) pero con contexto suficiente por tema.
- Es mejor un newsletter corto e informativo que uno largo y vacio.

RECORDATORIO DE TONO — LEE ESTO:
- NO escribas "debemos", "deberiamos", "tenemos que", "necesitamos", "hay que"
- NO escribas como si algo fuera una amenaza o emergencia
- NO hagas recomendaciones de accion
- NO uses "Para nosotros" ni "nuestras soluciones" ni "rivalizando directamente"
- SI escribe de forma informativa, interesante y observacional
- Imagina que le estas contando noticias interesantes a un amigo que trabaja en fintech. Informas, no alarmas.

RECORDATORIO DE DATOS — LEE ESTO:
- NUNCA inventes cifras, montos, porcentajes, fechas o nombres que no esten en las signals
- Extrae TODOS los datos concretos que SI esten en las signals (en el campo "Hecho")
- Si una signal es vaga ("Mastercard esta facilitando pagos"), no la rellenes con datos inventados — describela como esta o no la uses como tema principal
- Mejor un newsletter corto y veridico que uno largo y especulativo
- Los titulos deben ser ESPECIFICOS, no etiquetas genericas. "Visa compra YellowPepper para entrar a real-time payments" > "Movimientos en LATAM"
- El parrafo de ecosistema debe tener MINIMO 50 palabras (idealmente 70-100), con sustancia: conecta los temas con tendencias del ecosistema, no resumas lo ya dicho. Si es muy corto sera rechazado.
- En section_assignments usa SOLO estos 5 valores en "section": "que_paso", "implicancia_fintoc", "competencia", "regulacion", "tendencias". Cualquier otro valor sera rechazado por la base de datos.`;

  const response = await callLLM({
    system: SYSTEM_PROMPT,
    userMessage,
    maxTokens: 8192,
  });

  try {
    const cleaned = response.replace(/\`\`\`json\n?/g, '').replace(/\`\`\`\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      tema_semana: String(parsed.tema_semana || 'Newsletter Semanal'),
      content_md: String(parsed.content_md || ''),
      content_slack: String(parsed.content_slack || '').substring(0, 3900),
      section_assignments: Array.isArray(parsed.section_assignments)
        ? parsed.section_assignments.map((sa: any) => ({
            signal_id: String(sa.signal_id),
            section: String(sa.section),
            sort_order: Number(sa.sort_order) || 0,
          }))
        : [],
    };
  } catch (e) {
    console.error('[newsletter] Failed to parse LLM response:', response.substring(0, 300));
    return {
      tema_semana: 'Newsletter Semanal',
      content_md: response.length > 100 ? response : 'Error al generar newsletter.',
      content_slack: '*Strategy Intel Weekly*\nError al generar el newsletter. Revise los logs.',
      section_assignments: [],
    };
  }
}

/**
 * Validate newsletter content against Fintoc's rules
 */
export function validateNewsletter(content: NewsletterContent, signalCount: number): {
  valid: boolean;
  checks: Array<{ id: string; pass: boolean; level: 'fail' | 'warn'; detail: string }>;
  errors: string[];
  warnings: string[];
} {
  const rules = FINTOC_CONTEXT.newsletter.validation_rules;
  const checks: Array<{ id: string; pass: boolean; level: 'fail' | 'warn'; detail: string }> = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check minimum topics in content (## headers in the memo)
  const topicHeaders = (content.content_md.match(/^## .+/gm) || []);
  const topicCount = topicHeaders.length;
  const minTopics = 2;
  const hasTopics = topicCount >= minTopics;
  checks.push({
    id: 'min_topics',
    pass: hasTopics,
    level: 'fail',
    detail: `${topicCount}/${minTopics} temas desarrollados`,
  });
  if (!hasTopics) errors.push(`Minimo ${minTopics} temas desarrollados requeridos`);

  // Check content exists
  const hasContent = content.content_md.length > 200;
  checks.push({
    id: 'has_content',
    pass: hasContent,
    level: 'fail',
    detail: `Content length: ${content.content_md.length} chars`,
  });
  if (!hasContent) errors.push('Contenido insuficiente');

  // Check tema_semana
  const hasTema = content.tema_semana.length > 3;
  checks.push({
    id: 'has_tema',
    pass: hasTema,
    level: 'warn',
    detail: hasTema ? content.tema_semana : 'Sin tema',
  });
  if (!hasTema) warnings.push('Falta tema de la semana');

  // Check signal count
  const hasEnoughSignals = signalCount >= rules.min_sources;
  checks.push({
    id: 'min_signals',
    pass: hasEnoughSignals,
    level: 'warn',
    detail: `${signalCount} signals (minimo ${rules.min_sources})`,
  });
  if (!hasEnoughSignals) warnings.push(`Solo ${signalCount} signals (minimo recomendado: ${rules.min_sources})`);

  // Check for forbidden prescriptive language
  const forbiddenPatterns = /debemos|deber[ií]amos|tenemos que|necesitamos|hay que actuar|amenaza directa|nos pone en jaque|rivalizando directamente/gi;
  const hasForbiddenLanguage = forbiddenPatterns.test(content.content_slack) || forbiddenPatterns.test(content.content_md);
  checks.push({
    id: 'no_prescriptive_language',
    pass: !hasForbiddenLanguage,
    level: 'warn',
    detail: hasForbiddenLanguage ? 'Contiene lenguaje prescriptivo o alarmista' : 'Tono correcto',
  });
  if (hasForbiddenLanguage) warnings.push('El newsletter contiene lenguaje prescriptivo o alarmista que deberia ser revisado');

  // Check ecosystem paragraph length (must be substantive, not a 1-line throwaway)
  const ecosystemMatch = content.content_slack.match(/Y esto que significa para el ecosistema\?\*([\s\S]*?)(?=\n---|\n:robot|$)/i);
  const ecosystemText = ecosystemMatch ? ecosystemMatch[1].trim() : '';
  const ecosystemWordCount = ecosystemText.split(/\s+/).filter(Boolean).length;
  const minEcosystemWords = 50;
  const ecosystemOk = ecosystemWordCount >= minEcosystemWords;
  checks.push({
    id: 'ecosystem_paragraph_length',
    pass: ecosystemOk,
    level: 'warn',
    detail: `Parrafo ecosistema: ${ecosystemWordCount} palabras (minimo ${minEcosystemWords})`,
  });
  if (!ecosystemOk) warnings.push(`El parrafo de ecosistema tiene solo ${ecosystemWordCount} palabras (minimo recomendado: ${minEcosystemWords}). Debe ser mas denso y observacional.`);

  // Check section_assignments use valid section IDs
  const validSectionIds = new Set(FINTOC_CONTEXT.newsletter.sections.map(s => s.id));
  const invalidSections = content.section_assignments
    .map(sa => sa.section)
    .filter(sec => !validSectionIds.has(sec));
  const sectionsOk = invalidSections.length === 0;
  checks.push({
    id: 'valid_section_ids',
    pass: sectionsOk,
    level: 'warn',
    detail: sectionsOk
      ? 'Todas las secciones son validas'
      : `Secciones invalidas detectadas: ${[...new Set(invalidSections)].join(', ')}`,
  });
  if (!sectionsOk) warnings.push(`El LLM genero secciones no permitidas: ${[...new Set(invalidSections)].join(', ')}. Solo se aceptan: ${[...validSectionIds].join(', ')}`);

  return {
    valid: errors.length === 0,
    checks,
    errors,
    warnings,
  };
}
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
