import { callClaude } from './client';
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
  .map(s => `- "${s.id}": ${s.name} â ${s.description}`)
  .join('\n');

const SYSTEM_PROMPT = `Eres el editor del newsletter "Strategy Intel Weekly" de Fintoc.

${getFintocContextPrompt()}

Tu trabajo es generar el newsletter semanal a partir de las signals curadas.

El newsletter debe:
1. Tener un "tema de la semana" que capture la tendencia dominante
2. Organizar las signals en secciones
3. Ser conciso, profesional, y en espanol
4. Cada seccion debe tener contenido accionable para el equipo de Fintoc
5. Incluir URLs de las fuentes como links

Secciones disponibles:
${SECTIONS}

Responde UNICAMENTE con JSON valido (sin markdown, sin backticks):
{
  "tema_semana": "<titulo corto del tema de la semana>",
  "content_md": "<newsletter completo en formato Markdown>",
  "content_slack": "<version compacta para Slack en mrkdwn, max 3800 chars>",
  "section_assignments": [
    { "signal_id": "<id>", "section": "<section_id>", "sort_order": <numero> }
  ]
}

Formato del content_md:
# Strategy Intel Weekly â [Tema de la Semana]
_Semana del [fecha]_

## Que paso
[Resumen ejecutivo, 3-5 bullets de los eventos mas importantes]

## Implicancia Fintoc
[Para cada evento clave, que significa para Fintoc y que deberiamos hacer]

## Movimientos de competencia
[Actividad de competidores relevantes]

## Regulacion
[Cambios regulatorios importantes. Si no hay, omitir seccion]

## Tendencias
[Tendencias emergentes a monitorear]

---
_Fuentes: [lista de fuentes con links]_

Formato del content_slack (version compacta, max 3800 chars):
Usa *bold* para titulos, <url|texto> para links. Sin headers ##.`;

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

  const userMessage = `Genera el newsletter de la semana del ${dateStr}.

Hay ${signals.length} signals curadas:

${signalsSummary}

Recuerda:
- Priorizar signals con impact_level "high"
- Asegurarte de cubrir regiones CL y MX
- Maximo 30% contenido global
- El content_slack debe ser una version compacta (max 3800 chars) del content_md`;

  const response = await callClaude({
    system: SYSTEM_PROMPT,
    userMessage,
    maxTokens: 8192,
  });

  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
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
    console.error('[newsletter] Failed to parse Claude response:', response.substring(0, 300));
    // Try to extract content even if JSON parsing failed
    // Claude might have returned just the markdown directly
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
