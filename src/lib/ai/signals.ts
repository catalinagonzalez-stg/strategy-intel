import { callClaude } from './client';
import { getFintocContextPrompt } from '@/lib/fintoc-context';
import type { SignalType, ImpactLevel } from '@/lib/supabase/types';

export interface SignalResult {
  signal_type: SignalType;
  impact_level: ImpactLevel;
  horizon: '0-3m' | '3-12m' | '12m+';
  summary_factual: string;
  fintoc_implication: string;
  low_evidence: boolean;
}

interface ArticleForSignal {
  id: string;
  title: string;
  url: string | null;
  source_domain: string | null;
  content_snippet: string | null;
  published_at: string | null;
  notes: string | null;
  region?: string;
  topics?: string[];
  relevance_score?: number;
  why_relevant?: string;
}

const SYSTEM_PROMPT = `Eres un analista de inteligencia estrategica para Fintoc.

${getFintocContextPrompt()}

Tu trabajo es generar "signals" (senales estrategicas) a partir de articulos curados. Cada signal debe ser actionable y relevante para la toma de decisiones de Fintoc.

Debes responder UNICAMENTE con un JSON valido (sin markdown, sin backticks) con esta estructura:
{
  "signal_type": "<regulation|competition|product|infra|funding|social>",
  "impact_level": "<high|med|low>",
  "horizon": "<0-3m|3-12m|12m+>",
  "summary_factual": "<resumen factual en espanol, 1-2 oraciones. Solo hechos, sin opinion>",
  "fintoc_implication": "<implicancia especifica para Fintoc, que deberia hacer o considerar>",
  "low_evidence": <true si la informacion es debil o de una sola fuente>
}

Criterios de impact_level:
- high: Afecta directamente revenue, regulacion obligatoria, competidor directo lanza producto similar
- med: Tendencia importante, cambio regulatorio indirecto, movimiento de competidor indirecto
- low: Informativo, tendencia emergente, mencion menor

Criterios de horizon:
- 0-3m: Accion inmediata requerida o impacto en los proximos 3 meses
- 3-12m: Tendencia que se materializara en 3-12 meses
- 12m+: Tendencia a largo plazo`;

export async function generateSignal(article: ArticleForSignal): Promise<SignalResult> {
  const userMessage = `Genera una signal estrategica para este articulo curado:

Titulo: ${article.title}
Fuente: ${article.source_domain || 'desconocida'}
URL: ${article.url || 'N/A'}
Publicado: ${article.published_at || 'N/A'}
Region: ${article.region || 'global'}
Topics: ${(article.topics || []).join(', ') || 'N/A'}
Relevancia: ${article.relevance_score ?? 'N/A'}/10
Por que es relevante: ${article.why_relevant || 'N/A'}
Notas editoriales: ${article.notes || 'Ninguna'}
Contenido: ${(article.content_snippet || '').substring(0, 2000)}`;

  const response = await callClaude({
    system: SYSTEM_PROMPT,
    userMessage,
    maxTokens: 1024,
  });

  try {
    const cleaned = response.replace(/\`\`\`json\n?/g, '').replace(/\`\`\`\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const validTypes: SignalType[] = ['regulation', 'competition', 'product', 'infra', 'funding', 'social'];
    const validImpact: ImpactLevel[] = ['high', 'med', 'low'];
    const validHorizon = ['0-3m', '3-12m', '12m+'];

    return {
      signal_type: validTypes.includes(parsed.signal_type) ? parsed.signal_type : 'infra',
      impact_level: validImpact.includes(parsed.impact_level) ? parsed.impact_level : 'med',
      horizon: validHorizon.includes(parsed.horizon) ? parsed.horizon as '0-3m' | '3-12m' | '12m+' : '3-12m',
      summary_factual: String(parsed.summary_factual || ''),
      fintoc_implication: String(parsed.fintoc_implication || ''),
      low_evidence: Boolean(parsed.low_evidence),
    };
  } catch (e) {
    console.error('[signals] Failed to parse Claude response:', response.substring(0, 200));
    return {
      signal_type: 'infra',
      impact_level: 'low',
      horizon: '3-12m',
      summary_factual: article.title,
      fintoc_implication: 'No se pudo generar implicancia automaticamente.',
      low_evidence: true,
    };
  }
}

/**
 * Generate signals for multiple articles
 */
export async function generateSignals(articles: ArticleForSignal[]): Promise<Map<string, SignalResult>> {
  const results = new Map<string, SignalResult>();

  for (const article of articles) {
    try {
      const signal = await generateSignal(article);
      results.set(article.id, signal);
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`[signals] Error generating signal for ${article.id}:`, err);
    }
  }

  return results;
}
