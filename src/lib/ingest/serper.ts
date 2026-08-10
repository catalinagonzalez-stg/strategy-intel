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
    // Regulators: OR-queries — Google News ANDs plain terms, and a strict AND
    // over a 7-day window returns almost nothing
    'CMF Chile': 'CMF (fintech OR "finanzas abiertas" OR normativa OR "medios de pago" OR "ley fintech")',
    'CNBV México': 'CNBV (fintech OR regulación OR sanción OR "tecnología financiera")',
    'Banxico': 'Banxico (pagos OR SPEI OR CoDi OR DiMo OR fintech OR regulación)',
    'Banco Central Chile': '"Banco Central" Chile (pagos OR TEF OR transferencias OR fraudes OR fintech)',
    'FNE Chile': 'FNE (competencia OR pagos OR fintech OR tarjetas)',
    'El Economista MX': 'El Economista Mexico fintech pagos',
    'La Tercera CL': 'La Tercera Chile fintech startups tecnologia',
    // Converted from broken RSS feeds — now using Google News via Serper
    'Diario Financiero': 'site:df.cl OR "Diario Financiero" fintech pagos Chile economia',
    // Cloudflare blocks server-side fetches of their RSS — searched via Google News instead
    'Ex-Ante (CL)': 'site:ex-ante.cl (fintech OR pagos OR banco OR CMF OR economía)',
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

// Google country (gl) / language (hl) per source, so LATAM queries don't run
// against the US/English Google News defaults.
function getSerperLocale(sourceName: string): { gl?: string; hl?: string } {
  const CL = ['(CL)', 'Chile', 'La Tercera', 'Diario Financiero', 'CMF', 'FNE', 'Banco Central Chile', 'Khipu', 'Toku', 'Etpay', 'Transbank', 'Klap', 'leaders_CL'];
  const MX = ['(MX', 'México', 'Mexico', 'CNBV', 'Banxico', 'El Economista', 'Conekta', 'Clip', 'Kushki', 'leaders_MX'];
  const BR = ['(BR)', 'EBANX'];
  const LATAM = ['LATAM', 'latam', 'Bloomberg Linea', 'Contxto', 'dLocal', 'Mercado Pago', 'Belvo', 'Prometeo', 'infra_pagos', 'regulacion', 'fintech_latam'];
  if (CL.some(k => sourceName.includes(k))) return { gl: 'cl', hl: 'es' };
  if (MX.some(k => sourceName.includes(k))) return { gl: 'mx', hl: 'es' };
  if (BR.some(k => sourceName.includes(k))) return { gl: 'br', hl: 'pt' };
  if (LATAM.some(k => sourceName.includes(k))) return { hl: 'es' };
  return {};
}

// Map the source locale to a Google News edition (hl/gl/ceid triplet).
function getGoogleNewsEdition(sourceName: string): { hl: string; gl: string; ceid: string } {
  const { gl, hl } = getSerperLocale(sourceName);
  if (hl === 'es') {
    const country = (gl || 'US').toUpperCase();
    return { hl: 'es-419', gl: country, ceid: `${country}:es-419` };
  }
  if (hl === 'pt') return { hl: 'pt-BR', gl: 'BR', ceid: 'BR:pt-419' };
  return { hl: 'en-US', gl: 'US', ceid: 'US:en' };
}

function extractItemTag(itemXml: string, tag: string): string | null {
  const cdata = itemXml.match(new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i'));
  if (cdata) return cdata[1].trim();
  const plain = itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return plain ? plain[1].trim() : null;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)));
}

/**
 * Search Google News for a source's query, via the free RSS endpoint
 * (news.google.com/rss/search). Replaces the paid Serper API — the prepaid
 * account ran out of credits (ago-2026) and won't be recharged. Source type
 * stays 'serper' in the DB; only the transport changed.
 */
export async function fetchSerperNews(sourceName: string, sourceUrl: string | null): Promise<ParsedEntry[]> {
  const query = buildSearchQuery(sourceName, sourceUrl);
  const { hl, gl, ceid } = getGoogleNewsEdition(sourceName);
  // when:7d replicates the old tbs=qdr:w one-week window
  const url = 'https://news.google.com/rss/search?q=' + encodeURIComponent(query + ' when:7d')
    + '&hl=' + hl + '&gl=' + gl + '&ceid=' + encodeURIComponent(ceid);
  console.log('[serper] Google News RSS search "' + query + '" [' + ceid + '] (source: ' + sourceName + ')');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' },
    });
    if (!response.ok) {
      throw new Error('Google News RSS returned ' + response.status + ' for "' + sourceName + '"');
    }
    const xml = await response.text();
    const items = xml.split('<item>').slice(1);
    const entries: ParsedEntry[] = [];
    for (const item of items.slice(0, 10)) {
      const rawTitle = extractItemTag(item, 'title');
      const link = extractItemTag(item, 'link');
      if (!rawTitle || !link) continue;
      // Google News titles come as "Headline - Medio"; <source> carries the outlet
      const sourceTag = extractItemTag(item, 'source');
      const sourceUrlAttr = item.match(/<source[^>]*url="([^"]*)"/i)?.[1];
      let title = decodeEntities(rawTitle);
      if (sourceTag && title.endsWith(' - ' + decodeEntities(sourceTag))) {
        title = title.slice(0, -(' - ' + decodeEntities(sourceTag)).length);
      }
      let sourceDomain = sourceName;
      try { sourceDomain = new URL(sourceUrlAttr || link).hostname; } catch { /* keep sourceName */ }
      const pubDate = extractItemTag(item, 'pubDate');
      const hash = createHash('sha256').update(title + link).digest('hex');
      entries.push({
        title,
        url: link,
        author: sourceTag ? decodeEntities(sourceTag) : null,
        content_snippet: title,
        content_text: title,
        published_at: parseSerperDate(pubDate || undefined),
        source_domain: sourceDomain,
        content_hash: hash,
      });
    }
    console.log('[serper] Got ' + entries.length + ' results for "' + sourceName + '"');
    return entries;
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw new Error('Google News request timed out for "' + sourceName + '"');
    throw error;
  } finally { clearTimeout(timeout); }
}
