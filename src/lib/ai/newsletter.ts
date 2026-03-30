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

Tu trabajo es escribir un MEMO ESTRATEGICO semanal, NO un resumen de noticias.

PRINCIPIOS EDITORIALES:
1. FOCO > COBERTURA: Maximo 2-3 temas bien desarrollados. Nunca mas de 3. Es mejor profundidad que amplitud.
2. DATOS DUROS: Cada afirmacion debe tener un numero, monto, porcentaje o metrica. "Visa se expandio" NO sirve. "Visa adquirio Prisma por USD 1.2B, sumando 40M tarjetas en Argentina" SI sirve.
3. OPINION CON FUNDAMENTO: No describas, interpreta. Di lo que crees que significa para Fintoc y que deberian hacer. Toma posicion.
4. PREGUNTAS QUE PROVOQUEN: Cada tema termina con una pregunta estrategica que obligue al equipo a pensar. No preguntas genericas ("que opinas?") sino especificas ("Deberiamos acelerar la integracion con X antes de que Y cierre el deal en MX?")
5. ALERTAS URGENTES: Si hay algo critico (regulacion, movimiento de competidor directo), va primero como alerta de 2-3 lineas.

AUDIENCIA: Todo el equipo de Fintoc (~50 personas). Deben poder leerlo en 3 minutos y salir con una idea clara de "que esta pasando y por que nos importa".

Secciones disponibles para section_assignments:
${SECTIONS}

Responde UNICAMENTE con JSON valido (sin markdown, sin backticks):
{
  "tema_semana": "<titulo que capture la tesis central, no un resumen>",
  "content_md": "<memo estrategico en Markdown>",
  "content_slack": "<version Slack en mrkdwn, max 3800 chars>",
  "section_assignments": [
    { "signal_id": "<id>", "section": "<section_id>", "sort_order": <numero> }
  ]
}

FORMATO del content_md:

# Strategy Intel Weekly — [Tema: una tesis, no un resumen]
_Semana del [fecha]_

[SI HAY ALERTA URGENTE: 2-3 lineas marcadas con 🚨 sobre regulacion o movimiento critico de competidor]

## [Titulo del Tema 1 — con angulo, no descriptivo]
**Que paso:** [Parrafo corto con datos duros: montos, porcentajes, fechas, nombres]
**Por que importa:** [Interpretacion para Fintoc. Toma posicion. "Esto significa que..." "Esto abre la puerta a..." "El riesgo es que..."]
**Pregunta para el equipo:** [Pregunta estrategica especifica que obligue a pensar]
_Fuente: [link]_

## [Titulo del Tema 2]
[Mismo formato]

## [Titulo del Tema 3 — solo si realmente aporta]
[Mismo formato]

---
_Strategy Intel — Fintoc | [N] fuentes analizadas esta semana_

FORMATO del content_slack (max 3800 chars):
Version compacta con *bold* para titulos, <url|texto> para links. Mantener los datos duros y las preguntas estrategicas. Sin headers ##.`;

export async function generateNewsletter(signals: SignalForNewsletter[]): Promise<NewsletterContent> {
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

  const userMessage = `Genera el memo estrategico de la semana del ${dateStr}.

Hay ${signals.length} signals curadas. Tu trabajo NO es mencionar todas. Selecciona las 2-3 mas importantes y desarrollalas con profundidad.

${signalsSummary}

INSTRUCCIONES CRITICAS:
- MAXIMO 3 temas. Si hay 30 signals, igual son maximo 3 temas. Agrupa signals relacionadas bajo un mismo tema.
- Cada tema DEBE tener datos duros (montos, %, cifras). Si una signal no tiene datos, busca en el contexto o mencionalo como limitacion.
- Priorizar signals con impact_level "high" y publicadas esta semana.
- Si una signal tiene fecha > 10 dias, NO usarla como tema principal. Puede ser contexto.
- Priorizar regiones CL y MX. Maximo 1 tema global.
- Las preguntas estrategicas deben ser ESPECIFICAS a Fintoc. No "que opinan?" sino "Deberiamos lanzar X en MX antes de Q3?"
- El content_slack debe ser compacto (max 3800 chars) pero mantener datos duros y preguntas.
- Es mejor un memo corto y denso que uno largo y vacio.`;

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

  // Check minimum sections
  const sectionIds = new Set(content.section_assignments.map(sa => sa.section));
  const hasSections = sectionIds.size >= rules.min_sections;
  checks.push({
    id: 'min_sections',
    pass: hasSections,
    level: 'fail',
    detail: `${sectionIds.size}/${rules.min_sections} secciones`,
  });
  if (!hasSections) errors.push(`Minimo ${rules.min_sections} secciones requeridas`);

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
