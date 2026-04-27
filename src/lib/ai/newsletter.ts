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

const SYSTEM_PROMPT = `Eres el editor de "Strategy Intel Weekly", un briefing semanal de inteligencia de mercado para una fintech de pagos en Chile y Mexico.

${getFintocContextPrompt()}

═══ TU TRABAJO ═══

Reportar HECHOS relevantes del mundo fintech/pagos en Chile y Mexico. Solo hechos con datos. NO interpretes, NO recomiendes, NO conectes noticias con productos nuestros. El equipo sacara sus propias conclusiones.

═══ REGLAS ═══

PROHIBIDO:
- Interpretar que significa la noticia para nosotros ("esto pone presion sobre...", "esto abre oportunidad para...")
- Recomendar acciones ("debemos", "necesitamos", "hay que", "sera clave")
- Conectar noticias con productos nuestros ("impacta nuestro Smart Checkout", "ventaja para Conexiones")
- Buzzwords ("enorme oportunidad", "soluciones innovadoras", "fortalecer posicion")
- Seccion "Para nosotros" — NO EXISTE. Solo reporta el hecho.

SELECCION DE TEMAS (2-3 temas, todos diferentes):
1. Regulacion CL/MX (open banking, CMF, CNBV)
2. Competidores directos (Prometeo, Belvo, Khipu, Etpay, Kushki) con movimientos concretos
3. Deals con datos (USD, %, usuarios) en CL/MX o LATAM
4. Infraestructura de pagos con cifras

DESCARTAR: LinkedIn sin datos, Brasil/Peru sin impacto directo en CL/MX, tendencias genericas, low_evidence=true, POS/NFC/terminales fisicos.

REGLA DE DATOS: sin al menos 1 cifra concreta, NO es tema.
REGLA DE DIVERSIDAD: cada tema es una historia distinta. No 3 temas del mismo pais o misma tematica. Mezcla: regulacion + competencia + deal.
REGLA TL;DR: solo hechos y datos, no interpretacion. "Nu Mexico llega a 15M usuarios" SI. "Nu Mexico impacta el open banking" NO.
REGLA FUENTES: cada tema incluye link a la fuente.

═══ FORMATO ═══

JSON valido (sin markdown, sin backticks):
{
  "tema_semana": "<titular periodistico corto>",
  "content_md": "<briefing en Markdown>",
  "content_slack": "<version Slack mrkdwn, max 3800 chars>",
  "section_assignments": [{ "signal_id": "<id>", "section": "<${FINTOC_CONTEXT.newsletter.sections.map(s => s.id).join('|')}>", "sort_order": <n> }]
}

content_md:

# Strategy Intel Weekly — [Titular]
_Semana del [fecha]_

## [Tema 1: titulo factual con dato]
[Parrafo de 3-5 lineas reportando QUE PASO. Incluir: quien, que, cuando, cuanto, donde. Solo hechos verificables con cifras.]
_Fuente: [link]_

## [Tema 2: titulo factual con dato]
[Mismo formato]

## [Tema 3 si tiene datos]
[Mismo formato]

---
:thread: _Discutamos: que significa esto para nosotros?_
_Strategy Intel — Fintoc | [N] fuentes_

content_slack (max 3800 chars, mrkdwn de Slack):

:newspaper: *Strategy Intel Weekly*
_Semana del [fecha]_
━━━━━━━━━━━━━━━━━━━━

*TL;DR:*
• [hecho + dato en 1 linea]
• [hecho + dato en 1 linea]
• [hecho + dato en 1 linea]

━━━━━━━━━━━━━━━━━━━━

[EMOJI] *[Titulo con dato]*
[2-3 oraciones: que paso, quien, cuanto, cuando. Solo hechos.]
:link: <[URL]|[fuente]>

[EMOJI] *[Titulo 2 con dato]*
[Mismo formato]

[EMOJI si hay tema 3] *[Titulo 3]*
[Mismo formato]

━━━━━━━━━━━━━━━━━━━━
:speech_balloon: _Que significa esto para nosotros? Discutamos en el thread_ :point_down:
_Strategy Intel — Fintoc_

Tono: periodista de fintech — directo, conciso, factual. Oraciones cortas.`;

export interface NewsletterContext {
  recentTopics?: string[];  // temas de ediciones recientes para evitar repeticion
  hotTopics?: string[];     // temas trending de Slack u otras fuentes
}

export async function generateNewsletter(signals: SignalForNewsletter[], context?: NewsletterContext): Promise<NewsletterContent> {
  if (signals.length === 0) {
    return {
      tema_semana: 'Sin signals esta semana',
      content_md: '# Strategy Intel Weekly\n\nNo hay signals suficientes para generar el newsletter esta semana.',
      content_slack: '*Strategy Intel Weekly*\nNo hay signals suficientes para generar el newsletter esta semana.',
      section_assignments: [],
    };
  }

  const signalsSummary = signals.map((s, i) => `
Signal ${i + 1} (id: ${s.id}):
- Tipo: ${s.signal_type} | Impacto: ${s.impact_level} | Horizonte: ${s.horizon}
- Hecho: ${s.summary_factual}
- Implicancia Fintoc: ${s.fintoc_implication}
- Fuente: ${s.supporting_source} (${s.supporting_url})
- Publicado: ${s.supporting_published_at}
- Evidencia debil: ${s.low_evidence ? 'Si' : 'No'}
`).join('\n');

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
  const dateStr = weekStart.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });

  // Build context sections for deduplication and hot topics
  let contextBlock = '';
  if (context?.recentTopics && context.recentTopics.length > 0) {
    contextBlock += `\nTEMAS DE EDICIONES RECIENTES (NO REPETIR — busca angulos frescos o avances nuevos):\n${context.recentTopics.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n`;
  }
  if (context?.hotTopics && context.hotTopics.length > 0) {
    contextBlock += `\nTEMAS HOT EN FINTOC (priorizar si hay signals relacionadas):\n${context.hotTopics.map((t, i) => `- ${t}`).join('\n')}\n`;
  }

  const userMessage = `Semana del ${dateStr}. ${signals.length} signals disponibles.
${contextBlock}
PASO 1 — FILTRA: Lee todas las signals. Descarta las que no tienen datos duros (USD, %, cantidad). Descarta low_evidence=true. Descarta POS/NFC/terminales fisicos.

PASO 2 — SELECCIONA 2-3 TEMAS DIFERENTES: De las que quedan, elige 2-3 priorizando: regulacion CL/MX > competidores directos > deals con montos. Cada tema debe ser una historia distinta (no 3 del mismo pais o misma tematica).

PASO 3 — ESCRIBE: Para cada tema, reporta SOLO QUE PASO. Quien, que, cuando, cuanto, donde. Solo hechos verificables con cifras. Incluye link a la fuente. NO interpretes, NO recomiendes, NO conectes con nuestros productos.

RECUERDA: Eres periodista, no consultor. Solo reportas hechos.

${signalsSummary}`;

  // Retry loop: generate, validate, regenerate with feedback up to MAX_RETRIES
  const MAX_RETRIES = 3;
  let lastContent: NewsletterContent | null = null;
  let lastViolations: string[] = [];

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const currentMessage = attempt === 1
      ? userMessage
      : `${userMessage}\n\n═══ INTENTO ${attempt}: TU RESPUESTA ANTERIOR FUE RECHAZADA ═══\nViolaciones detectadas:\n${lastViolations.map(v => `- ${v}`).join('\n')}\n\nCorrige TODAS las violaciones. Si no las corriges, el newsletter sera rechazado de nuevo.`;

    const response = await callLLM({
      system: SYSTEM_PROMPT,
      userMessage: currentMessage,
      maxTokens: 8192,
    });

    try {
      const cleaned = response.replace(/\`\`\`json\n?/g, '').replace(/\`\`\`\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      lastContent = {
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

      // Run content quality checks
      const violations = checkContentViolations(lastContent);
      if (violations.length === 0) {
        console.log(`[newsletter] Passed validation on attempt ${attempt}`);
        return lastContent;
      }

      lastViolations = violations;
      console.warn(`[newsletter] Attempt ${attempt}/${MAX_RETRIES} rejected: ${violations.join('; ')}`);

      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (e) {
      console.error(`[newsletter] Attempt ${attempt} parse error:`, response.substring(0, 300));
      lastViolations = ['JSON parse error — responde SOLO con JSON valido'];
      if (attempt === MAX_RETRIES) {
        return {
          tema_semana: 'Newsletter Semanal',
          content_md: response.length > 100 ? response : 'Error al generar newsletter.',
          content_slack: '*Strategy Intel Weekly*\nError al generar el newsletter. Revise los logs.',
          section_assignments: [],
        };
      }
    }
  }

  // If we exhausted retries, return last content with warnings
  console.warn(`[newsletter] Exhausted ${MAX_RETRIES} retries. Returning last attempt with violations: ${lastViolations.join('; ')}`);
  return lastContent || {
    tema_semana: 'Newsletter Semanal',
    content_md: 'Error: no se pudo generar un newsletter que pase validacion.',
    content_slack: '*Strategy Intel Weekly*\nError al generar. Revise los logs.',
    section_assignments: [],
  };
}

/**
 * Check content for rule violations that require regeneration.
 * Returns array of violation descriptions. Empty = passed.
 */
function checkContentViolations(content: NewsletterContent): string[] {
  const violations: string[] = [];
  const allText = `${content.content_md} ${content.content_slack}`;
  const allTextLower = allText.toLowerCase();

  // 1. Prescriptive / recommendation language — this is a FACTUAL briefing, no opinions
  const prescriptive = allText.match(/\b(necesitamos|debemos|tenemos que|hay que|nos obliga a|exige que|es crucial|sera clave|es necesario|es fundamental|necesidad de|es imperativo|es urgente que|mover ficha|apuntalar|deberiamos|recomendamos|conviene que)\b/gi);
  if (prescriptive) {
    violations.push(`Lenguaje prescriptivo: "${prescriptive.slice(0, 3).join('", "')}". Este es un briefing FACTUAL — solo reporta hechos, no recomiendes acciones.`);
  }

  // 2. Interpretation / opinion language — should NOT connect news to "us"
  const interpretation = allText.match(/\b(esto significa para nosotros|pone presi[oó]n sobre|abre oportunidad|nos posiciona|nuestra estrategia|nuestro producto|impacta nuestro|ventaja para nosotros|nos afecta|nos beneficia|para nosotros)\b/gi);
  if (interpretation) {
    violations.push(`Interpretacion detectada: "${interpretation.slice(0, 3).join('", "')}". NO interpretes que significa para nosotros — el equipo lo discutira en el thread.`);
  }

  // 3. Consultancy buzzwords
  const buzzwords = allText.match(/\b(enorme oportunidad|oportunidad clave|oportunidad para consolidar|fortalecer.{0,10}posicion|robustecer|explorar alianzas|soluciones innovadoras|adaptar.{0,10}oferta|competir eficazmente|posici[oó]n ventajosa|campo f[eé]rtil)\b/gi);
  if (buzzwords) {
    violations.push(`Buzzwords de consultoria: "${buzzwords.slice(0, 3).join('", "')}". Solo hechos y datos.`);
  }

  // 4. Topic diversity — all topics should NOT be about the same thing
  const topicTitles = (content.content_md.match(/^## .+/gm) || [])
    .map(t => t.replace('## ', '').toLowerCase());
  if (topicTitles.length >= 3) {
    const getWords = (t: string) => t.replace(/[^a-záéíóúñü\s]/gi, '').split(/\s+/).filter(w => w.length > 3);
    const allTitleWords = topicTitles.map(getWords);
    const wordFreq: Record<string, number> = {};
    for (const words of allTitleWords) {
      const unique = [...new Set(words)];
      for (const w of unique) wordFreq[w] = (wordFreq[w] || 0) + 1;
    }
    const repeatedThemes = Object.entries(wordFreq)
      .filter(([word, count]) => count >= topicTitles.length && !['para', 'como', 'entre', 'hacia', 'nuevo', 'nueva', 'chile', 'mexico', 'weekly', 'strategy', 'intel'].includes(word))
      .map(([word]) => word);
    if (repeatedThemes.length > 0) {
      violations.push(`Temas repetitivos: todos hablan de "${repeatedThemes.join(', ')}". Elige temas DIFERENTES — mezcla regulacion, competencia, y deals.`);
    }
  }

  // 5. Fintoc product mentions in body — briefing should NOT connect to our products
  const productMentions = allTextLower.match(/\b(smart checkout|conexiones|transferencias bancarias|suscripciones pac|cobros charges|cuentas empresariales|cards\/apple pay)\b/gi);
  if (productMentions) {
    violations.push(`Mencion de productos Fintoc: "${productMentions.slice(0, 2).join('", "')}". Este briefing NO conecta noticias con nuestros productos — solo reporta hechos.`);
  }

  // 6. Fintoc mentioned in body (not footer)
  const bodyText = allText.split('Strategy Intel — Fintoc')[0] || allText;
  const fintocInBody = bodyText.replace(/Strategy Intel Weekly/g, '').replace(/Strategy Intel — Fintoc/g, '');
  if (/\bFintoc\b/i.test(fintocInBody)) {
    violations.push('No menciones "Fintoc" en el cuerpo del newsletter. Solo aparece en el footer.');
  }

  // 7. Source links — each topic should include a link
  const topicSections = content.content_slack.split(/━+/).filter(s => s.includes('*') && s.length > 100);
  const sectionsWithoutLinks = topicSections.filter(s => !s.includes('<http') && !s.includes(':link:'));
  if (sectionsWithoutLinks.length > 0 && topicSections.length > 0) {
    violations.push(`${sectionsWithoutLinks.length} tema(s) sin link a fuente en version Slack. Cada tema debe incluir :link: <URL|fuente>.`);
  }

  return violations;
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
  const minTopics = 2; // New memo format: 2-3 deep topics
  const hasTopics = topicCount >= minTopics;
  checks.push({
    id: 'min_topics',
    pass: hasTopics,
    level: 'fail',
    detail: `${topicCount}/${minTopics} temas desarrollados`,
  });
  if (!hasTopics) errors.push(`Minimo ${minTopics} temas desarrollados requeridos`);

  // Check for content violations (prescriptive, buzzwords, wrong mapping)
  const contentViolations = checkContentViolations(content);
  const noViolations = contentViolations.length === 0;
  checks.push({
    id: 'content_quality',
    pass: noViolations,
    level: 'warn',
    detail: noViolations ? 'Sin violaciones de contenido' : contentViolations.join('; '),
  });
  if (!noViolations) {
    for (const v of contentViolations) warnings.push(v);
  }

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

  return {
    valid: errors.length === 0,
    checks,
    errors,
    warnings,
  };
}
