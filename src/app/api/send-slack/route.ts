import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

const MAX_SLACK_LEN = 3900;

/**
 * Convert markdown newsletter (content_md) into a concise, single-message
 * Slack mrkdwn version that always fits within MAX_SLACK_LEN.
 *
 * Strategy: extract the key sections from the validated newsletter and
 * format them for Slack readability. If the full conversion still exceeds
 * the limit, progressively trim lower-priority content.
 */
export function mdToSlack(md: string): string {
      let text = md;

  // Strip markdown formatting -> Slack mrkdwn
  text = text.replace(/\*\*(.+?)\*\*/g, '*$1*');
      text = text.replace(/^### (.+)$/gm, '*$1*');
      text = text.replace(/^## (.+)$/gm, '\n*$1*');
      text = text.replace(/^# (.+)$/gm, '\n*$1*');
      text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<$2|$1>');
      text = text.replace(/^---+$/gm, '');
      text = text.replace(/\n{3,}/g, '\n\n');

  // If already fits, return as-is
  if (text.trim().length <= MAX_SLACK_LEN) {
          return text.trim();
  }

  // If too long, extract the core sections and rebuild a compact version.
  // Sections we care about (in priority order):
  //   1. Title / opening paragraph (the hook)
  //   2. "Lo importante" (signal + what happened)
  //   3. "Implicancia para Fintoc"
  //   4. "Pregunta estratégica"
  const sections = md.split(/\n(?=##?\s|📰|🔎|🤔)/);

  let opening = '';
      let loImportante = '';
      let implicancia = '';
      let pregunta = '';

  for (const section of sections) {
          const lower = section.toLowerCase();
          if (lower.includes('lo importante') || lower.includes('qué pasó') || lower.includes('que pasó')) {
                    loImportante += section + '\n';
          } else if (lower.includes('implicancia')) {
                    implicancia += section + '\n';
          } else if (lower.includes('pregunta')) {
                    pregunta += section + '\n';
          } else if (!opening) {
                    opening = section + '\n';
          }
  }

  // Rebuild compact version
  let compact = [opening.trim(), loImportante.trim(), implicancia.trim(), pregunta.trim()]
        .filter(Boolean)
        .join('\n\n');

  // Convert to Slack mrkdwn
  compact = compact.replace(/\*\*(.+?)\*\*/g, '*$1*');
      compact = compact.replace(/^### (.+)$/gm, '*$1*');
      compact = compact.replace(/^## (.+)$/gm, '\n*$1*');
      compact = compact.replace(/^# (.+)$/gm, '\n*$1*');
      compact = compact.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<$2|$1>');
      compact = compact.replace(/^---+$/gm, '');
      compact = compact.replace(/\n{3,}/g, '\n\n');

  // If still too long, trim from the bottom (pregunta first, then implicancia details)
  if (compact.length > MAX_SLACK_LEN) {
          compact = [opening.trim(), loImportante.trim(), implicancia.trim()]
            .filter(Boolean)
            .join('\n\n');
          compact = compact.replace(/\*\*(.+?)\*\*/g, '*$1*');
          compact = compact.replace(/^### (.+)$/gm, '*$1*');
          compact = compact.replace(/^## (.+)$/gm, '\n*$1*');
          compact = compact.replace(/^# (.+)$/gm, '\n*$1*');
          compact = compact.replace(/\n{3,}/g, '\n\n');
  }

  // Last resort: hard truncate
  if (compact.length > MAX_SLACK_LEN) {
          compact = compact.substring(0, MAX_SLACK_LEN - 3) + '...';
  }

  return compact.trim();
}

export async function POST(request: Request) {
      const { edition_id } = await request.json();
      if (!edition_id) {
              return NextResponse.json({ error: 'edition_id required' }, { status: 400 });
      }

  const supabase = createServiceClient();

  const { data: edition, error } = await supabase
        .from('newsletter_editions')
        .select('*')
        .eq('id', edition_id)
        .single();

  if (error || !edition) {
          return NextResponse.json({ error: 'Edition not found' }, { status: 404 });
  }

  if (edition.status !== 'validated') {
          return NextResponse.json({ error: `Cannot send: status is ${edition.status}` }, { status: 400 });
  }

  const slackToken = process.env.SLACK_BOT_TOKEN;
      const channelId = process.env.SLACK_CHANNEL_ID;
      if (!slackToken || !channelId) {
              return NextResponse.json({ error: 'Slack not configured' }, { status: 500 });
      }

  const sourceMd = edition.content_md || '';
      if (!sourceMd) {
              return NextResponse.json({ error: 'No newsletter content (content_md) found' }, { status: 400 });
      }

  // Always a single message, always under 3900 chars
  const content = mdToSlack(sourceMd);

  const res = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
                    'Authorization': `Bearer ${slackToken}`,
                    'Content-Type': 'application/json',
          },
          body: JSON.stringify({ channel: channelId, text: content, mrkdwn: true }),
  });
      const result = await res.json();
      if (!result.ok) {
              return NextResponse.json({ error: `Slack error: ${result.error}` }, { status: 500 });
      }

  await supabase
        .from('newsletter_editions')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', edition_id);

  return NextResponse.json({ ok: true, chars: content.length });
}
