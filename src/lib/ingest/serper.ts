import { createHash } from 'crypto';
import { type ParsedEntry } from './rss';

function parseSerperDate(dateStr: string | undefined): string {
  if (!dateStr) return new Date().toISOString();
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed.toISOString();
  const now = Date.now();
  const lower = dateStr.toLowerCase();
  const relMatch = lower.match(/(\d+)\s*(hour|hora|minute|minuto|day|día|dia|week|semana|month|mes|second|segundo)s?\s*(ago|atrás|atras)?/);
  if (relMatch) {
    const amount = parseInt(relMatch[1], 10);
    const unit = relMatch[2];
    let ms = 0;
    if (unit.startsWith('second') || unit.startsWith('segundo')) ms = amount * 1000;
    else if (unit.startsWith('minute') || unit.startsWith('minuto')) ms = amount * 60 * 1000;
    else if (unit.startsWith('hour') || unit.startsWith('hora')) ms = amount * 3600 * 1000;
    else if (unit.startsWith('day') || unit.startsWith('día') || unit.startsWith('dia')) ms = amount * 86400 * 1000;
    else if (unit.startsWith('week') || unit.startsWith('semana')) ms = amount * 7 * 86400 * 1000;
    else if (unit.startsWith('month') || unit.startsWith('mes')) ms = amount * 30 * 86400 * 1000;
    return new Date(now - ms).toISOString();
  }
  return new Date().toISOString();
}

interface SerperNewsResult { title: string; link: string; snippet: string; date?: string; source?: string; imageUrl?: string; }
interface SerperResponse { news?: SerperNewsResult[]; searchParameters?: { q: string; type: string; }; }

function buildSearchQuery(sourceName: string, sourceUrl: string | null): string {
  const keywordSources: Record<string, string> = {
    'Serper - payments_global': 'fintech payments infrastructure news',
    'Serper - infra_pagos': 'infraestructura pagos fintech latinoamerica',
    'Serper - regulacion': 'regulacion fintech pagos latinoamerica open banking',
    'Serper - latam_pais': 'fintech latinoamerica pagos digitales startups',
    // LinkedIn topic monitoring
    'LinkedIn - fintech_latam': 'site:linkedin.com fintech pagos latinoamerica open banking',
    'LinkedIn - payments_infra': 'site:linkedin.com payments infrastructure API fintech',
    'LinkedIn - competitors': 'site:linkedin.com (Khipu OR Toku OR Etpay OR Kushki OR dLocal OR EBANX OR Belvo OR Prometeo) fintech',
  };
  if (keywordSources[sourceName]) return keywordSources[sourceName];

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
    'CNBV México': 'CNBV Mexico regulacion fintech',
    'Banxico': 'Banxico Mexico pagos regulacion',
    'Banco Central Chile': 'Banco Central Chile pagos regulacion',
    'FNE Chile': 'FNE Chile competencia fintech',
    'El Economista MX': 'El Economista Mexico fintech pagos',
    'La Tercera CL': 'La Tercera Chile fintech startups tecnologia',
    // Converted from broken RSS feeds — now using Google News via Serper
    'Diario Financiero': 'site:df.cl OR "Diario Financiero" fintech pagos Chile economia',
    'Bloomberg Linea': 'site:bloomberglinea.com fintech pagos latinoamerica',
    'Contxto': 'site:contxto.com OR Contxto startups fintech latinoamerica',
    'The Paypers': 'site:thepaypers.com OR "The Paypers" payments fintech',
    'Fintech Futures': 'site:fintechfutures.com OR "Fintech Futures" payments banking fintech',
    // LinkedIn company pages — competitor announcements
    'LinkedIn - Fintoc': 'site:linkedin.com/company/fintoc OR site:linkedin.com/in/ Fintoc pagos',
    'LinkedIn - Khipu': 'site:linkedin.com (Khipu pagos Chile announcement OR hiring)',
    'LinkedIn - dLocal': 'site:linkedin.com dLocal pagos latinoamerica',
    'LinkedIn - EBANX': 'site:linkedin.com EBANX payments fintech',
    'LinkedIn - Belvo': 'site:linkedin.com Belvo open banking API',
    'LinkedIn - MercadoPago': 'site:linkedin.com "Mercado Pago" fintech pagos',
    // LinkedIn thought leaders & executives
    'LinkedIn - leaders_CL': 'site:linkedin.com (fintech OR pagos OR "open banking") Chile CEO founder',
    'LinkedIn - leaders_MX': 'site:linkedin.com (fintech OR pagos OR "open banking") Mexico CEO founder',
  };
  if (entityQueries[sourceName]) return entityQueries[sourceName];

  const cleanName = sourceName.replace(/\(.*?\)/g, '').replace(/serper\s*-?\s*/i, '').trim();
  return cleanName + ' fintech pagos';
}

export async function fetchSerperNews(sourceName: string, sourceUrl: string | null): Promise<ParsedEntry[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) { console.warn('[serper] SERPER_API_KEY not configured'); return []; }
  const query = buildSearchQuery(sourceName, sourceUrl);
  console.log('[serper] Searching for "' + query + '" (source: ' + sourceName + ')');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch('https://google.serper.dev/news', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: 10, tbs: 'qdr:w' }),
      signal: controller.signal,
    });
    if (!response.ok) { console.warn('[serper] API returned ' + response.status); return []; }
    const data: SerperResponse = await response.json();
    const results = data.news || [];
    console.log('[serper] Got ' + results.length + ' results for "' + sourceName + '"');
    return results.map((item): ParsedEntry => {
      const hash = createHash('sha256').update(item.title + item.link).digest('hex');
      let sourceDomain = sourceName;
      try { sourceDomain = new URL(item.link).hostname; } catch { sourceDomain = item.source || sourceName; }
      return {
        title: item.title, url: item.link, author: item.source || null,
        content_snippet: item.snippet || null, content_text: item.snippet || null,
        published_at: parseSerperDate(item.date), source_domain: sourceDomain, content_hash: hash,
      };
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') { console.warn('[serper] Request timed out for "' + sourceName + '"'); }
    else { console.error('[serper] Error searching for "' + sourceName + '":', error); }
    return [];
  } finally { clearTimeout(timeout); }
}
