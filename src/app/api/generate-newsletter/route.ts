import { NextResponse } from 'next/server';

const N8N_BASE = process.env.N8N_WEBHOOK_BASE || 'https://fintoc.app.n8n.cloud';

export async function POST() {
  try {
    const res = await fetch(`${N8N_BASE}/webhook/curate-weekly`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ triggered_from: 'app', timestamp: new Date().toISOString() }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `n8n responded ${res.status}: ${text.substring(0, 200)}` },
        { status: 502 },
      );
    }

    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
