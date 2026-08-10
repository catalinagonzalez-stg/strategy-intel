import { createHash } from 'crypto';
import { type ParsedEntry } from './rss';

interface SlackMessage {
  ts: string;
  text?: string;
  user?: string;
  bot_id?: string;
  subtype?: string;
  reply_count?: number;
  attachments?: Array<{ title?: string; title_link?: string; text?: string }>;
}

// Slack wraps links as <https://url|label> or <https://url>
const SLACK_LINK_RE = /<(https?:\/\/[^|>]+)(?:\|[^>]*)?>/g;

function unwrapSlackText(text: string): string {
  return text.replace(SLACK_LINK_RE, (_, url) => url).replace(/\s+/g, ' ').trim();
}

/**
 * Read links the team posted in a Slack channel over the last 7 days and
 * return them as ingest entries. Bot messages are skipped so the pipeline
 * never re-ingests its own newsletter. Articles from this source are
 * inserted directly as 'promoted': a link a human at Fintoc considered
 * worth sharing outranks any relevance score.
 */
export async function fetchSlackLinks(channelId: string): Promise<ParsedEntry[]> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error('SLACK_BOT_TOKEN not configured');

  const oldest = (Date.now() / 1000 - 7 * 86400).toFixed(0);
  const res = await fetch(
    `https://slack.com/api/conversations.history?channel=${channelId}&oldest=${oldest}&limit=200`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error('Slack API HTTP ' + res.status);
  const data = await res.json();
  // e.g. missing_scope (needs channels:history) or not_in_channel (invite the bot)
  if (!data.ok) throw new Error('Slack API error: ' + data.error);

  const entries: ParsedEntry[] = [];
  const seenUrls = new Set<string>();

  for (const msg of (data.messages || []) as SlackMessage[]) {
    if (msg.bot_id || msg.subtype) continue;

    const urls = Array.from(msg.text?.matchAll(SLACK_LINK_RE) || [], m => m[1]);
    for (const url of urls) {
      let host: string;
      try { host = new URL(url).hostname; } catch { continue; }
      if (host.endsWith('slack.com') || seenUrls.has(url)) continue;
      seenUrls.add(url);

      const attachment = (msg.attachments || []).find(a => a.title_link === url && a.title);
      const messageText = unwrapSlackText(msg.text || '');
      const title = attachment?.title || messageText.slice(0, 140) || host;
      const replies = msg.reply_count ? ` [${msg.reply_count} respuestas en el hilo]` : '';
      const context = `Compartido por el equipo en Slack.${replies} Mensaje: ${messageText}`;

      entries.push({
        title,
        url,
        author: msg.user ? `slack:${msg.user}` : null,
        content_snippet: context.slice(0, 500),
        content_text: (attachment?.text ? `${context} — ${attachment.text}` : context).slice(0, 5000),
        published_at: new Date(parseFloat(msg.ts) * 1000).toISOString(),
        source_domain: host,
        content_hash: createHash('sha256').update(url).digest('hex'),
      });
    }
  }

  console.log(`[slack] Found ${entries.length} team-shared links in the last 7 days`);
  return entries;
}
