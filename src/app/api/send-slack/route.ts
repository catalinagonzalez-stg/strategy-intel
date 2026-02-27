import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

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

  let content = edition.content_slack || edition.content_md || '';

  const MAX_SLACK_LEN = 3900;
  const messages: string[] = [];
  if (content.length > MAX_SLACK_LEN) {
    const sectionBreaks = ['\n\n🔍 *Bajo el radar*', '\n\n📡 *En el radar*', '\n\n🤔 *La pregunta del lunes*'];
    let splitAt = -1;
    for (const brk of sectionBreaks) {
      const idx = content.indexOf(brk);
      if (idx > 0 && idx < MAX_SLACK_LEN) splitAt = idx;
    }
    if (splitAt <= 0) {
      splitAt = content.lastIndexOf('\n\n', MAX_SLACK_LEN - 200);
    }
    if (splitAt <= 0) splitAt = MAX_SLACK_LEN;
    messages.push(content.substring(0, splitAt));
    messages.push(content.substring(splitAt));
  } else {
    messages.push(content);
  }

  for (const text of messages) {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${slackToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel: channelId, text, mrkdwn: true }),
    });
    const result = await res.json();
    if (!result.ok) {
      return NextResponse.json({ error: `Slack error: ${result.error}` }, { status: 500 });
    }
  }

  await supabase
    .from('newsletter_editions')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', edition_id);

  return NextResponse.json({ ok: true, messages_sent: messages.length });
}
