import { callLLM } from './client';
import { getFintocContextPrompt, FINTOC_CONTEXT } from '@/lib/fintoc-context';

interface SignalForNewsletter {
  id: string;
  signal_type: string;
  impact_level: string | null;
  horizon: string | null;
  summary_factual: string;
  fintoc_implication: string;
  supporting_url: string;
  supporting_source: string;
  supporting_published_at: string;
  low_evidence: boolean;
}

export interface NewsletterContent {
  tema_semana: string;
  content_md: string;
  content_slack: string;
  section_assignments: Array<{
    signal_id: string;
    section: string;
    sort_order: number;
  }>;
}

const SECTIONS = FINTOC_CONTEXT.newsletter.sections
  .map(s => `- "${s.id}": ${s.name} — ${s.description}`)
  .join('\n');

const SYSTEM_PROMPT = `Eres el editor del newsletter "Strategy Intel Weekly" de Fintoc.

${getFintocContextPrompt()}

Tu trabajo es escribir un MEMO ESTRATEGICO semanal, NO un resumen de noticias.

PRINCIPIOS EDITORIALES:
1. FOCO > COBERTURA: Maximo 2-3 temas bien desarrollados. Nunca mas de 3. Es mejor profundidad que amplitud.
2. DATOS DUROS OBLIGATORIOS: Si un tema NO tiene al menos un dato concreto (monto USD, porcentaje, cantidad de usuarios, fecha de implementacion, volumen de transacciones), NO PUEDE SER TEMA. Descartalo y elige otro. "Visa se expandio" NO sirve. "Visa adquirio Prisma por USD 1.2B, sumando 40M tarjetas en Argentina" SI sirve. Sin numero = sin tema.
3. INTERPRETACION SIN PRESCRIPCION: Interpreta que significan los hechos, pero NUNCA digas que "debemos", "necesitamos", "tenemos que" hacer algo. No des ordenes. Presenta hechos y deja que el lector piense. BIEN: "Esto pone presion sobre el A2A en Chile." MAL: "Necesitamos robustecer nuestros sistemas."
4. SIN PREGUNTAS POR TEMA: NO pongas preguntas al final de cada noticia. La unica pregunta del newsletter va en "Lo que queda dando vueltas" al final.
5. RELEVANCIA REAL: Solo temas que impacten DIRECTAMENTE a los mercados activos (Chile y Mexico). Brasil, Peru, Colombia son contexto secundario — solo si la noticia tiene impacto directo en CL o MX. "BTG se expande a Peru" NO es tema a menos que afecte directamente a un producto nuestro en CL/MX.
6. MAPEO COMPETITIVO CORRECTO: NO inventes conexiones competitivas. Entiende que hace cada competidor antes de conectarlo con un producto nuestro. Si no hay conexion clara, no la fuerces.

COMO SELECCIONAR TEMAS (sigue este orden de prioridad):
1. REGULACION que afecte directamente a nuestros productos en CL/MX (ej: cambios en open banking, nuevas reglas CMF/CNBV)
2. COMPETIDORES DIRECTOS haciendo movimientos (Belvo, Prometeo, Khipu, Etpay, Toku, Kushki — ver lista completa arriba). Si un competidor directo levanta plata, lanza producto, o consigue certificacion, eso es tema.
3. DEALS CON DATOS: levantamientos de capital, adquisiciones, alianzas con montos especificos en CL/MX
4. INFRAESTRUCTURA DE PAGOS: cambios en rails, pagos instantaneos, regulacion de pagos — pero solo con datos concretos

DESCARTAR siempre:
- Posts de LinkedIn sin datos verificables
- Noticias de Brasil/Peru/Argentina que no afecten CL/MX directamente
- Tendencias genericas ("la IA esta cambiando los pagos", "las fintechs desafian a la banca")
- Anything sobre POS fisico, terminales, NFC presencial (no es nuestro negocio)
- Eventos/conferencias sin anuncios concretos
- Signals marcadas como low_evidence: true (solo usar como contexto secundario, nunca como tema principal)

DISTINGUIR PRODUCTOS CORRECTAMENTE:
- Smart Checkout = checkout ONLINE que orquesta metodos de pago en e-commerce. NO tiene que ver con POS fisico ni terminales.
- Cards/Apple Pay = procesamiento de tarjetas ONLINE. NO es Tap to Pay ni NFC en tiendas fisicas.
- Transferencias IdP = pagos A2A iniciados por el pagador. Compite con Khipu, Etpay, Toku.
- Conexiones/Movimientos = open banking, lectura de datos bancarios. Compite con Belvo, Prometeo, Pluggy.
- Suscripciones PAC = cobros recurrentes. Compite con Khipu PAC, Reveniu.
- CPF = cuentas empresariales para plataformas. Compite con bancos tradicionales.

LENGUAJE PROHIBIDO (si usas estas frases, el newsletter falla validacion):
- "necesitamos", "debemos", "tenemos que", "hay que" (prescriptivo)
- "exige que reaccionemos", "nos obliga a" (alarmista)
- "robustecer", "fortalecer nuestra posicion" (vacio)
- "explorar alianzas estrategicas" (consultoria generica)
- "innovaciones en seguridad", "soluciones innovadoras" (buzzword)
- "enorme oportunidad", "una oportunidad para consolidar" (consultoria)
- "adaptar rapidamente", "competir eficazmente" (vacio)
- Cualquier oracion que suene a recomendacion de consultora

AUDIENCIA: Todo el equipo de Fintoc (~50 personas). Deben poder leerlo en 3 minutos y salir con una idea clara de "que esta pasando y por que nos importa".

Secciones disponibles para section_assignments:
${SECTIONS}

Responde UNICAMENTE con JSON valido (sin markdown, sin backticks):
{
  "tema_semana": "<titulo que capture la tesis central, no un resumen>",
  "content_md": "<memo estrategico en Markdown>",
  "content_slack": "<version Slack en mrkdwn, max 3800 chars>",
  "section_assignments": [
    { "signal_id": "<id>", "section": "<section_id>", "sort_order": <numero> }
  ]
}

FORMATO del content_md:

# Strategy Intel Weekly — [Tema: una tesis, no un resumen]
_Semana del [fecha]_

[SI HAY ALERTA URGENTE: 2-3 lineas marcadas con 🚨 sobre regulacion o movimiento critico de competidor]

## [Titulo del Tema 1 — con angulo, no descriptivo]
**Que paso:** [Parrafo con datos duros: montos, porcentajes, fechas, nombres. SIN DATOS = NO ES TEMA.]
**Por que importa:** [Interpretacion. "Esto significa que..." "Esto pone presion sobre..." "El riesgo es que..." NUNCA "debemos" ni "necesitamos".]
_Fuente: [link]_

## [Titulo del Tema 2]
[Mismo formato: que paso con datos + por que importa sin prescripcion]

## [Titulo del Tema 3 — solo si realmente aporta y tiene datos]
[Mismo formato]

---
## Lo que queda dando vueltas
[2-3 oraciones que conecten las noticias con un PRODUCTO ESPECIFICO de Fintoc (Smart Checkout, Transferencias IdP, Suscripciones PAC, Conexiones, Cards, CPF). No hables de Fintoc en abstracto. Menciona el producto, su ventaja concreta, y como la noticia lo afecta. Termina con una pregunta provocadora para el equipo. Min 40 palabras.]

---
_Strategy Intel — Fintoc | [N] fuentes analizadas esta semana_

FORMATO del content_slack (max 3800 chars):
El content_slack es el PRODUCTO PRINCIPAL. Debe dar ganas de leerlo en Slack. Usa mrkdwn nativo de Slack.

REGLAS DE TONO PARA SLACK:
- Escribe como un colega senior que te cuenta las noticias en el pasillo, no como un analista que presenta un informe.
- Primera linea = gancho que genera urgencia o curiosidad. NO "Innovacion en Pagos A2A". SI "Santander y Visa acaban de lanzar pagos con IA en Chile. Esto nos afecta directamente."
- Oraciones cortas. Parrafos de 1-2 lineas maximo. La gente escanea en Slack.
- Usa "nosotros/nos" cuando hables de Fintoc. "Esto nos pone en jaque" > "Esto pone a Fintoc en una posicion complicada".

TEMPLATE EXACTO del content_slack (usa mrkdwn de Slack, NO markdown):

:rotating_light: *Strategy Intel Weekly*
_Semana del [fecha]_
━━━━━━━━━━━━━━━━━━━━

*TL;DR — Lo que necesitas saber:*
• [Bullet 1: hecho + implicancia en 1 linea. Ej: "Santander lanza pagos IA en Chile — competencia directa para nuestro A2A"]
• [Bullet 2: mismo formato]
• [Bullet 3: mismo formato]

━━━━━━━━━━━━━━━━━━━━

[EMOJI] *[Titulo corto y con angulo]*
[1-2 oraciones de que paso, con datos duros concretos]
:arrow_right: *Para nosotros:* [Interpretacion directa, 1-2 oraciones. SIN "debemos/necesitamos/tenemos que".]

[EMOJI] *[Titulo tema 2]*
[Mismo patron: datos + interpretacion sin prescripcion]

[EMOJI tema 3 si aplica]
[Mismo patron]

━━━━━━━━━━━━━━━━━━━━
:brain: *Lo que queda dando vueltas*
[2-3 oraciones que conecten las noticias de la semana con un producto ESPECIFICO de Fintoc. No hables de Fintoc en abstracto — menciona el producto concreto (Smart Checkout, Transferencias IdP, Suscripciones PAC, Conexiones, Cards, CPF) y explica como la noticia lo afecta. Ej: "Si los pagos A2A crecen 40% en Chile, nuestras Transferencias IdP — que ya tienen 99% de cobertura bancaria — estan en la posicion perfecta para capturar ese volumen. La pregunta es si aceleramos la expansion a MX antes de que Khipu se instale alla." Min 40 palabras.]

━━━━━━━━━━━━━━━━━━━━
:speech_balloon: _Discutamos en el thread_ :point_down:
_Strategy Intel — Fintoc | [N] fuentes analizadas_

EMOJIS POR TIPO DE TEMA (elige segun contenido):
- :rotating_light: Alerta urgente / regulacion critica
- :crossed_swords: Competencia / movimiento de competidor
- :shield: Regulacion / compliance
- :chart_with_upwards_trend: Tendencia / oportunidad de mercado
- :rocket: Producto / tecnologia nueva
- :moneybag: Funding / M&A
- :globe_with_meridians: Expansion / mercado nuevo

IMPORTANTE: El content_slack NO es una conversion del content_md. Es una pieza independiente, optimizada para engagement en Slack. Debe ser escaneable en 30 segundos y leible en profundidad en 2 minutos.`;

export interface NewsletterContext {
  recentTopics?: string[];  // temas de ediciones recientes para evitar repeticion
  hotTopics?: string[];     // temas trending de Slack u otras fuentes
}

export async function generateNewsletter(signals: SignalForNewsletter[], context?: NewsletterContext): Promise<NewsletterContent> {
  if (signals.length === 0) {
    return {
      tema_semana: 'Sin signals esta semana',
      content_md: '# Strategy Intel Weekly\n\nNo hay signals suficientes para generar el newsletter esta semana.',
      content_slack: '*Strategy Intel Weekly*\nNo hay signals suficientes para generar el newsletter esta semana.',
      section_assignments: [],
    };
  }

  const signalsSummary = signals.map((s, i) => `
Signal ${i + 1} (id: ${s.id}):
- Tipo: ${s.signal_type} | Impacto: ${s.impact_level} | Horizonte: ${s.horizon}
- Hecho: ${s.summary_factual}
- Implicancia Fintoc: ${s.fintoc_implication}
- Fuente: ${s.supporting_source} (${s.supporting_url})
- Publicado: ${s.supporting_published_at}
- Evidencia debil: ${s.low_evidence ? 'Si' : 'No'}
`).join('\n');

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
  const dateStr = weekStart.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });

  // Build context sections for deduplication and hot topics
  let contextBlock = '';
  if (context?.recentTopics && context.recentTopics.length > 0) {
    contextBlock += `\nTEMAS DE EDICIONES RECIENTES (NO REPETIR — busca angulos frescos o avances nuevos):\n${context.recentTopics.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n`;
  }
  if (context?.hotTopics && context.hotTopics.length > 0) {
    contextBlock += `\nTEMAS HOT EN FINTOC (priorizar si hay signals relacionadas):\n${context.hotTopics.map((t, i) => `- ${t}`).join('\n')}\n`;
  }

  const userMessage = `Genera el memo estrategico de la semana del ${dateStr}.

Hay ${signals.length} signals curadas. Tu trabajo NO es mencionar todas. Selecciona las 2-3 mas importantes y desarrollalas con profundidad.
${contextBlock}
${signalsSummary}

INSTRUCCIONES CRITICAS:
- MAXIMO 3 temas. Si hay 30 signals, igual son maximo 3 temas. Agrupa signals relacionadas bajo un mismo tema.
- SELECCION DE TEMAS: Primero filtra signals con datos duros (USD, %, cantidades). Luego prioriza: (1) regulacion CL/MX, (2) movimientos de competidores directos, (3) deals con montos. Si una signal no tiene ningun numero, NO es tema.
- Priorizar signals con impact_level "high" y publicadas esta semana.
- IGNORAR signals con low_evidence: true como tema principal. Solo como contexto.
- IGNORAR signals de LinkedIn sin datos verificables.
- SOLO Chile y Mexico como temas principales.
- NO pongas preguntas al final de cada tema. La UNICA pregunta va en "Lo que queda dando vueltas".
- NUNCA uses lenguaje prescriptivo. Interpreta hechos, no des ordenes.
- NO inventes conexiones con productos. Tap to Pay, NFC, POS fisico NO son Smart Checkout ni Cards. Open banking SI es Conexiones. A2A SI es Transferencias IdP.
- Tono: colega senior contandote algo en el pasillo. Oraciones cortas. "Nos/nosotros".
- NUNCA menciones "Fintoc" por nombre en el cuerpo. Usa "nosotros/nos". Solo en el footer.
- content_slack max 3800 chars.
- Es mejor un memo corto y denso que uno largo y vacio.`;

  const response = await callLLM({
    system: SYSTEM_PROMPT,
    userMessage,
    maxTokens: 8192,
  });

  try {
    const cleaned = response.replace(/\`\`\`json\n?/g, '').replace(/\`\`\`\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      tema_semana: String(parsed.tema_semana || 'Newsletter Semanal'),
      content_md: String(parsed.content_md || ''),
      content_slack: String(parsed.content_slack || '').substring(0, 3900),
      section_assignments: Array.isArray(parsed.section_assignments)
        ? parsed.section_assignments.map((sa: any) => ({
            signal_id: String(sa.signal_id),
            section: String(sa.section),
            sort_order: Number(sa.sort_order) || 0,
          }))
        : [],
    };
  } catch (e) {
    console.error('[newsletter] Failed to parse LLM response:', response.substring(0, 300));
    return {
      tema_semana: 'Newsletter Semanal',
      content_md: response.length > 100 ? response : 'Error al generar newsletter.',
      content_slack: '*Strategy Intel Weekly*\nError al generar el newsletter. Revise los logs.',
      section_assignments: [],
    };
  }
}

/**
 * Validate newsletter content against Fintoc's rules
 */
export function validateNewsletter(content: NewsletterContent, signalCount: number): {
  valid: boolean;
  checks: Array<{ id: string; pass: boolean; level: 'fail' | 'warn'; detail: string }>;
  errors: string[];
  warnings: string[];
} {
  const rules = FINTOC_CONTEXT.newsletter.validation_rules;
  const checks: Array<{ id: string; pass: boolean; level: 'fail' | 'warn'; detail: string }> = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check minimum topics in content (## headers in the memo)
  const topicHeaders = (content.content_md.match(/^## .+/gm) || []);
  const topicCount = topicHeaders.length;
  const minTopics = 2; // New memo format: 2-3 deep topics
  const hasTopics = topicCount >= minTopics;
  checks.push({
    id: 'min_topics',
    pass: hasTopics,
    level: 'fail',
    detail: `${topicCount}/${minTopics} temas desarrollados`,
  });
  if (!hasTopics) errors.push(`Minimo ${minTopics} temas desarrollados requeridos`);

  // Check for prescriptive language (should NOT be present)
  const prescriptivePatterns = /\b(necesitamos|debemos|tenemos que|hay que|nos obliga a|exige que)\b/gi;
  const prescriptiveMatches = content.content_slack?.match(prescriptivePatterns) || [];
  const noPrescriptive = prescriptiveMatches.length === 0;
  checks.push({
    id: 'no_prescriptive',
    pass: noPrescriptive,
    level: 'warn',
    detail: noPrescriptive ? 'Sin lenguaje prescriptivo' : `Lenguaje prescriptivo detectado: ${prescriptiveMatches.join(', ')}`,
  });
  if (!noPrescriptive) warnings.push(`Lenguaje prescriptivo encontrado: ${prescriptiveMatches.join(', ')}`);

  // Check content exists
  const hasContent = content.content_md.length > 200;
  checks.push({
    id: 'has_content',
    pass: hasContent,
    level: 'fail',
    detail: `Content length: ${content.content_md.length} chars`,
  });
  if (!hasContent) errors.push('Contenido insuficiente');

  // Check tema_semana
  const hasTema = content.tema_semana.length > 3;
  checks.push({
    id: 'has_tema',
    pass: hasTema,
    level: 'warn',
    detail: hasTema ? content.tema_semana : 'Sin tema',
  });
  if (!hasTema) warnings.push('Falta tema de la semana');

  // Check signal count
  const hasEnoughSignals = signalCount >= rules.min_sources;
  checks.push({
    id: 'min_signals',
    pass: hasEnoughSignals,
    level: 'warn',
    detail: `${signalCount} signals (minimo ${rules.min_sources})`,
  });
  if (!hasEnoughSignals) warnings.push(`Solo ${signalCount} signals (minimo recomendado: ${rules.min_sources})`);

  return {
    valid: errors.length === 0,
    checks,
    errors,
    warnings,
  };
}
