import { callClaude } from './client';
import { getFintocContextPrompt, FINTOC_CONTEXT } from '@/lib/fintoc-context';
import type { TopicEnum, Region, Bucket, Confidence } from '@/lib/supabase/types';

export interface ClassificationResult {
  relevance_score: number;
  topics: TopicEnum[];
  region: Region;
  bucket: Bucket;
  summary: string;
  evidence_quote: string;
  why_relevant_to_fintoc: string;
  confidence: Confidence;
  freshness_days: number;
  is_weekly_eligible: boolean;
}

const TOPICS_LIST = [
  'a2a', 'rails', 'payouts', 'payins', 'acquiring', 'card_networks',
  'instant_payments', 'open_banking', 'open_finance', 'regulacion',
  'fraude', 'kyc_aml', 'lending', 'treasury', 'cross_border',
  'crypto_stablecoin', 'embedded_finance', 'competition', 'funding', 'infra',
];

const REGIONS_LIST = ['CL', 'MX', 'BR', 'CO', 'PE', 'LATAM', 'global'];
const BUCKETS_LIST = ['payments_global', 'infra_pagos', 'regulacion', 'latam_pais'];

const SYSTEM_PROMPT = `Eres un analista de inteligencia estrategica para Fintoc, una empresa de infraestructura financiera en Latinoamerica.

${getFintocContextPrompt()}

Tu trabajo es clasificar articulos y contenido segun su relevancia para Fintoc.

Debes responder UNICAMENTE con un JSON valido (sin markdown, sin backticks) con esta estructura exacta:
{
  "relevance_score": <numero 0-10>,
  "topics": [<array de topics relevantes>],
  "region": "<region principal>",
  "bucket": "<bucket>",
  "summary": "<resumen en 1-2 oraciones en espanol>",
  "evidence_quote": "<cita textual del articulo que respalda la clasificacion>",
  "why_relevant_to_fintoc": "<explicacion breve de por que es relevante para Fintoc>",
  "confidence": "<high|med|low>",
  "freshness_days": <dias desde publicacion>,
  "is_weekly_eligible": <true|false>
}

Topics validos: ${TOPICS_LIST.join(', ')}
Regiones validas: ${REGIONS_LIST.join(', ')}
Buckets validos: ${BUCKETS_LIST.join(', ')}

Criterios de relevancia:
- 9-10: Impacto directo en Fintoc (regulacion que afecta sus productos, competidor directo lanza algo similar)
- 7-8: Muy relevante para la industria de Fintoc en sus mercados
- 5-6: Relevante para fintech LATAM pero no directamente para Fintoc
- 3-4: Tangencialmente relacionado
- 0-2: No relevante

Criterios topics criticos: ${FINTOC_CONTEXT.topics_by_relevance.critical.join(', ')}
Topics alta relevancia: ${FINTOC_CONTEXT.topics_by_relevance.high.join(', ')}

Un articulo es weekly_eligible si: relevance_score >= 5 AND freshness_days <= 14 AND confidence != "low"`;

export async function classifyArticle(article: {
  title: string;
  content_snippet?: string | null;
  content_text?: string | null;
  url?: string | null;
  source_domain?: string | null;
  published_at?: string | null;
}): Promise<ClassificationResult> {
  const content = article.content_text || article.content_snippet || '';
  const publishedDaysAgo = article.published_at
    ? Math.max(0, Math.round((Date.now() - new Date(article.published_at).getTime()) / (1000 * 60 * 60 * 24)))
    : 7;

  const userMessage = `Clasifica este articulo:

Titulo: ${article.title}
Fuente: ${article.source_domain || 'desconocida'}
URL: ${article.url || 'N/A'}
Publicado hace: ${publishedDaysAgo} dias
Contenido: ${content.substring(0, 3000)}`;

  const response = await callClaude({
    system: SYSTEM_PROMPT,
    userMessage,
    maxTokens: 1024,
  });

  try {
    // Strip any markdown code fences if present
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      relevance_score: Math.min(10, Math.max(0, Number(parsed.relevance_score) || 0)),
      topics: (parsed.topics || []).filter((t: string) => TOPICS_LIST.includes(t)) as TopicEnum[],
      region: REGIONS_LIST.includes(parsed.region) ? parsed.region as Region : 'global',
      bucket: BUCKETS_LIST.includes(parsed.bucket) ? parsed.bucket as Bucket : 'payments_global',
      summary: String(parsed.summary || ''),
      evidence_quote: String(parsed.evidence_quote || ''),
      why_relevant_to_fintoc: String(parsed.why_relevant_to_fintoc || ''),
      confidence: (['high', 'med', 'low'].includes(parsed.confidence) ? parsed.confidence : 'med') as Confidence,
      freshness_days: Number(parsed.freshness_days) || publishedDaysAgo,
      is_weekly_eligible: Boolean(parsed.is_weekly_eligible),
    };
  } catch (e) {
    console.error('[classify] Failed to parse Claude response:', response.substring(0, 200));
    // Return a low-relevance default
    return {
      relevance_score: 0,
      topics: [],
      region: 'global',
      bucket: 'payments_global',
      summary: 'Error al clasificar',
      evidence_quote: '',
      why_relevant_to_fintoc: '',
      confidence: 'low',
      freshness_days: publishedDaysAgo,
      is_weekly_eligible: false,
    };
  }
}

/**
 * Classify multiple articles in sequence with rate-limiting awareness
 */
export async function classifyArticles(articles: Array<{
  id: string;
  title: string;
  content_snippet?: string | null;
  content_text?: string | null;
  url?: string | null;
  source_domain?: string | null;
  published_at?: string | null;
}>): Promise<Map<string, ClassificationResult>> {
  const results = new Map<string, ClassificationResult>();

  for (const article of articles) {
    try {
      const classification = await classifyArticle(article);
      results.set(article.id, classification);
      // Small delay between calls to be respectful of rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`[classify] Error classifying article ${article.id}:`, err);
    }
  }

  return results;
}
