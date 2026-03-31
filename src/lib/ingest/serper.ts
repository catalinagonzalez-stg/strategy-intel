import { createHash } from 'crypto';
import { type ParsedEntry } from './rss';

/**
 * Fetch news articles about a topic/company using Serper Google News API.
 *
 * Serper sources have:
 * - name: display name (e.g., "Khipu (CL)", "Serper - payments_global")
 * - url: target website or empty for keyword-based sources
 *
 * For company-specific sources (url = "https://www.khipu.com"),
 * we search for news about that company.
 *
 * For keyword-based sources (name = "Serper - payments_global"),
 * we search for the topic directly.
 */

interface SerperNewsResult {
  title: string;
  link: string;
  snippet: string;
  date?: string;
  source?: string;
  imageUrl?: string;
}

interface SerperResponse {
  news?: SerperNewsResult[];
  searchParameters?: {
    q: string;
    type: string;
  };
}

/**
 * Build a search query based on the source configuration.
 */
function buildSearchQuery(sourceName: string, sourceUrl: string | null): string {
  // Keyword-based sources
  const keywordSources: Record<string, string> = {
    'Serper - payments_global': 'fintech payments infrastructure news',
    'Serper - infra_pagos': 'infraestructura pagos fintech latinoamerica',
    'Serper - regulacion': 'regulacion fintech pagos latinoamerica open banking',
    'Serper - latam_pais': 'fintech latinoamerica pagos digitales startups',
  };

  if (keywordSources[sourceName]) {
    return keywordSources[sourceName];
  }

  // Company/entity sources
  const entityQueries: Record<string, string> = {
    'Khipu (CL)': 'Khipu pagos Chile fintech',
    'Toku (CL)': 'Toku Chile pagos fintech',
    'Etpay (CL)': 'Etpay Chile pagos fintech',
    'Conekta (MX)': 'Conekta Mexico pagos fintech',
    'Belvo': 'Belvo open banking API fintech',
    'Transbank (CL)': 'Transbank Chile pagos',
    'Klap (CL)': 'Klap Chile pagos fintech',
    'Kushki (MX/LATAM)': 'Kushki pagos latinoamerica fintech',
    'Stripe LATAM': 'Stripe latinoamerica pagos expansion',
    'Adyen LATAM': 'Adyen latinoamerica pagos expansion',
    'dLocal': 'dLocal pagos latinoamerica fintech',
    'Mercado Pago': 'Mercado Pago fintech pagos',
    'Clip (MX)': 'Clip Mexico pagos fintech',
    'EBANX (BR)': 'EBANX Brasil pagos fintech',
    'Prometeo': 'Prometeo open banking API latinoamerica',
    'CMF Chile': 'CMF Chile regulacion financiera fintech',
    'CNBV M\u00e9xico': 'CNBV Mexico regulacion fintech',
    'Banxico': 'Banxico Mexico pagos regulacion',
    'Banco Central Chile': 'Banco Central Chile pagos regulacion',
    'FNE Chile': 'FNE Chile competencia fintech',
    'El Economista MX': 'El Economista Mexico fintech pagos',
    'La Tercera CL': 'La Tercera Chile fintech startups tecnologia',
  };

  if (entityQueries[sourceName]) {
    return entityQueries[sourceName];
  }

  // Fallback: use the source name + fintech context
  const cleanName = sourceName
    .replace(/\(.*?\)/g, '')
    .replace(/serper\s*-?\s*/i, '')
    .trim();
  return cleanName + ' fintech pagos';
}

/**
 * Fetch news from Serper Google News API.
 */
export async function fetchSerperNews(
  sourceName: string,
  sourceUrl: string | null,
): Promise<ParsedEntry[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    console.warn('[serper] SERPER_API_KEY not configured');
    return [];
  }

  const query = buildSearchQuery(sourceName, sourceUrl);
  console.log('[serper] Searching for "' + query + '" (source: ' + sourceName + ')');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch('https://google.serper.dev/news', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        num: 10,
        tbs: 'qdr:w',
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn('[serper] API returned ' + response.status + ' for "' + sourceName + '"');
      return [];
    }

    const data: SerperResponse = await response.json();
    const results = data.news || [];
    console.log('[serper] Got ' + results.length + ' results for "' + sourceName + '"');

    return results.map((item): ParsedEntry => {
      const hash = createHash('sha256')
        .update(item.title + item.link)
        .digest('hex');

      let sourceDomain = sourceName;
      try {
        sourceDomain = new URL(item.link).hostname;
      } catch {
        sourceDomain = item.source || sourceName;
      }

      return {
        title: item.title,
        url: item.link,
        author: item.source || null,
        content_snippet: item.snippet || null,
        content_text: item.snippet || null,
        published_at: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
        source_domain: sourceDomain,
        content_hash: hash,
      };
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.warn('[serper] Request timed out for "' + sourceName + '"');
    } else {
      console.error('[serper] Error searching for "' + sourceName + '":', error);
    }
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
