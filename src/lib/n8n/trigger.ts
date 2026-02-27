const N8N_BASE = process.env.N8N_WEBHOOK_BASE || '';

export async function triggerGenerateNewsletter() {
  const res = await fetch(`${N8N_BASE}/webhook/generate-newsletter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ triggered_from: 'app', timestamp: new Date().toISOString() }),
  });
  return res.json();
}

export async function triggerGatekeep(editionId: string) {
  const res = await fetch(`${N8N_BASE}/webhook/gatekeep-newsletter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ edition_id: editionId }),
  });
  return res.json();
}
