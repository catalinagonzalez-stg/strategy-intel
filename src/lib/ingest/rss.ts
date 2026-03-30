import { createHash } from 'crypto';

export interface ParsedEntry {
    title: string;
    url: string;
    author: string | null;
    content_snippet: string | null;
    content_text: string | null;
    published_at: string | null;
    source_domain: string;
    content_hash: string;
}

/**
 * Parse RSS/Atom feed XML into structured entries.
 * Uses native XML parsing without external dependencies.
 */
export function parseFeedXml(xml: string, sourceDomain: string): ParsedEntry[] {
    const entries: ParsedEntry[] = [];

  // Detect feed type and extract items
  const isAtom = xml.includes('<feed') && xml.includes('xmlns="http://www.w3.org/2005/Atom"');

  if (isAtom) {
        const items = xml.split('<entry>').slice(1);
        for (const item of items) {
                const entry = parseAtomEntry(item, sourceDomain);
                if (entry) entries.push(entry);
        }
  } else {
        // RSS 2.0
      const items = xml.split('<item>').slice(1);
        for (const item of items) {
                const entry = parseRssItem(item, sourceDomain);
                if (entry) entries.push(entry);
        }
  }

  return entries;
}

function parseRssItem(itemXml: string, sourceDomain: string): ParsedEntry | null {
    const title = extractTag(itemXml, 'title');
    const link = extractTag(itemXml, 'link');
    if (!title) return null;

  const description = extractTag(itemXml, 'description');
    const contentEncoded = extractTag(itemXml, 'content:encoded');
    const author = extractTag(itemXml, 'author') || extractTag(itemXml, 'dc:creator');
    const pubDate = extractTag(itemXml, 'pubDate');

  const contentText = stripHtml(contentEncoded || description || '');
    const snippet = contentText.substring(0, 500);
    const hash = createHash('sha256').update(`${title}${link || ''}`).digest('hex');

  return {
        title: decodeHtmlEntities(title),
        url: link || '',
        author: author ? decodeHtmlEntities(author) : null,
        content_snippet: snippet || null,
        content_text: contentText.substring(0, 5000) || null,
        published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        source_domain: sourceDomain,
        content_hash: hash,
  };
}

function parseAtomEntry(entryXml: string, sourceDomain: string): ParsedEntry | null {
    const title = extractTag(entryXml, 'title');
    if (!title) return null;

  // Atom links are in attributes: <link href="..." />
  const linkMatch = entryXml.match(/<link[^>]*href="([^"]*)"[^>]*(?:rel="alternate")?/);
    const link = linkMatch?.[1] || '';

  const summary = extractTag(entryXml, 'summary');
    const content = extractTag(entryXml, 'content');
    const author = extractTag(entryXml, 'name'); // inside <author><name>
  const updated = extractTag(entryXml, 'updated') || extractTag(entryXml, 'published');

  const contentText = stripHtml(content || summary || '');
    const snippet = contentText.substring(0, 500);
    const hash = createHash('sha256').update(`${title}${link}`).digest('hex');

  return {
        title: decodeHtmlEntities(title),
        url: link,
        author: author ? decodeHtmlEntities(author) : null,
        content_snippet: snippet || null,
        content_text: contentText.substring(0, 5000) || null,
        published_at: updated ? new Date(updated).toISOString() : new Date().toISOString(),
        source_domain: sourceDomain,
        content_hash: hash,
  };
}

function extractTag(xml: string, tag: string): string | null {
    // Handle CDATA sections
  const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
    const cdataMatch = xml.match(cdataRegex);
    if (cdataMatch) return cdataMatch[1].trim();

  // Handle regular tags
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : null;
}

function stripHtml(html: string): string {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
}

function decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)));
}

/**
 * Fetch and parse an RSS feed URL.
 */
export async function fetchFeed(url: string, sourceDomain: string): Promise<ParsedEntry[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

  try {
        const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                          'User-Agent': 'StrategyIntel/1.0 (RSS Reader)',
                          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
                },
        });

      if (!response.ok) {
              console.warn(`[rss] Feed ${sourceDomain} returned ${response.status}`);
              return [];
      }

      const xml = await response.text();
        return parseFeedXml(xml, sourceDomain);
  } catch (error) {
        if ((error as Error).name === 'AbortError') {
                console.warn(`[rss] Feed ${sourceDomain} timed out`);
        } else {
                console.error(`[rss] Error fetching ${sourceDomain}:`, error);
        }
        return [];
  } finally {
        clearTimeout(timeout);
  }
}
