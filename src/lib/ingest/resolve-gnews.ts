/**
 * Resolve news.google.com/rss/articles/... redirect links to the real
 * article URL, so newsletters link directly to the outlet instead of an
 * opaque Google redirect (which the LLM tends to mangle or "prettify").
 *
 * Uses Google's internal DotsSplashUi/batchexecute endpoint (same method as
 * the googlenewsdecoder libraries). Best-effort: any failure returns null
 * and the caller keeps the original Google link.
 */

const GNEWS_RE = /news\.google\.com\/(?:rss\/)?articles\/([^?/]+)/;

export function isGoogleNewsUrl(url: string | null | undefined): boolean {
  return !!url && GNEWS_RE.test(url);
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveGoogleNewsUrl(link: string): Promise<string | null> {
  try {
    const m = link.match(GNEWS_RE);
    if (!m) return null;
    const articleId = m[1];

    // 1. Fetch the interstitial page to obtain the signed request params
    const pageRes = await fetchWithTimeout(
      `https://news.google.com/articles/${articleId}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } },
      10000,
    );
    if (!pageRes.ok) return null;
    const html = await pageRes.text();

    // Sometimes the target URL is directly present (legacy IDs)
    const directA = html.match(/<a[^>]+href="(https?:\/\/(?!news\.google|www\.google|accounts\.google|support\.google|policies\.google)[^"]+)"/);

    const dataP = html.match(/data-p="([^"]+)"/)?.[1];
    if (!dataP) return directA ? directA[1] : null;

    // 2. Build the batchexecute payload
    const decoded = dataP.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    const obj = JSON.parse(decoded.replace('%.@.', '["garturlreq",'));
    const inner = JSON.stringify([...obj.slice(0, -6), ...obj.slice(-2)]);
    const fReq = JSON.stringify([[['Fbv4je', inner, 'null', 'generic']]]);

    const res = await fetchWithTimeout(
      'https://news.google.com/_/DotsSplashUi/data/batchexecute',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        body: 'f.req=' + encodeURIComponent(fReq),
      },
      10000,
    );
    if (!res.ok) return directA ? directA[1] : null;
    const text = await res.text();

    // 3. Response is ")]}'\n\n<len>\n[[...]]" — find the JSON array line
    const jsonLine = text.split('\n').find(l => l.trim().startsWith('[['));
    if (!jsonLine) return directA ? directA[1] : null;
    const parsed = JSON.parse(jsonLine);
    const payload = parsed?.[0]?.[2];
    if (typeof payload !== 'string') return directA ? directA[1] : null;
    const urlCandidate = JSON.parse(payload)?.[1];
    if (typeof urlCandidate === 'string' && /^https?:\/\//.test(urlCandidate)) {
      return urlCandidate;
    }
    return directA ? directA[1] : null;
  } catch {
    return null;
  }
}
