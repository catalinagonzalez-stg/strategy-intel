const N8N_BASE = process.env.N8N_WEBHOOK_BASE || '';

/**
 * Generic n8n webhook trigger.
 * Sends a POST request to the specified n8n webhook endpoint.
 */
export async function triggerN8n(webhook: string, payload: Record<string, unknown>) {
    if (!N8N_BASE) {
          console.warn('[n8n] N8N_WEBHOOK_BASE not set, skipping webhook:', webhook);
          return { skipped: true, reason: 'N8N_WEBHOOK_BASE not configured' };
    }

  const url = `${N8N_BASE}/webhook/${webhook}`;

  try {
        const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
        });

      if (!res.ok) {
              const text = await res.text().catch(() => '(unable to read response)');
              console.warn(`[n8n] Webhook ${webhook} returned ${res.status}: ${text.substring(0, 200)}. Workflow may have executed successfully in Supabase.`);
              return { warning: true, status: res.status, message: text.substring(0, 200) };
      }

      return await res.json().catch(() => ({ ok: true }));
  } catch (error) {
        console.error(`[n8n] Webhook ${webhook} error:`, error instanceof Error ? error.message : String(error));
        return { error: true, message: String(error) };
  }
}

/**
 * Trigger newsletter generation workflow
 */
export async function triggerGenerateNewsletter() {
    return triggerN8n('generate-newsletter', {
          triggered_from: 'app',
          timestamp: new Date().toISOString(),
    });
}

/**
 * Trigger newsletter gatekeeping/validation workflow
 */
export async function triggerGatekeep(editionId: string) {
    return triggerN8n('gatekeep-newsletter', {
          edition_id: editionId,
    });
}
