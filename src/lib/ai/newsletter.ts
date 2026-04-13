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

Tu trabajo es escribir un RESUMEN SEMANAL informativo e interesante, como un colega senior que te cuenta las novedades mas relevantes de la industria. NO es un memo de crisis ni un plan de accion.

PRINCIPIOS EDITORIALES:
1. FOCO > COBERTURA: Maximo 2-3 temas bien desarrollados. Nunca mas de 3. Es mejor profundidad que amplitud.
2. CONTEXTO SUFICIENTE: Cada noticia debe tener 2-3 lineas que expliquen QUE paso concretamente (quien, que hizo, cuando, donde, cifras si hay). El lector no deberia tener que googlear para entender la noticia.
3. DATOS DUROS — REGLA ABSOLUTA: Si la signal contiene numeros, montos, porcentajes, fechas, nombres de empresas, paises, productos especificos: USALOS TODOS. Extrae cada cifra y dato concreto que aparezca en el campo "Hecho" de la signal. Si la signal NO tiene cifras, NO INVENTES — describe cualitativamente lo que dice y punto.
4. PROHIBIDO INVENTAR: Jamas inventes datos, cifras, montos o detalles que no esten explicitamente en las signals que recibes. Si una signal dice "Visa adquirio una fintech", NO escribas "Visa adquirio una fintech por USD 200M sumando 5M usuarios" si esos numeros no estan en la signal. Mejor escribir poco y verdadero que mucho e inventado.
5. CURIOSIDAD, NO ALARMA: El tono debe generar interes genuino. Nunca urgencia, miedo o sensacion de amenaza. Somos observadores informados del ecosistema, no bomberos apagando incendios.
6. NOTICIAS SEPARADAS: Si hay dos noticias distintas (ej. una sobre Nubank y otra sobre Visa), tratalas como temas separados con su propio contexto. No las mezcles en un parrafo sin explicar cada una.
7. TITULOS ESPECIFICOS: El tema_semana y los titulos de cada tema deben ser ESPECIFICOS, no genericos. Mal: "Movimientos Estrategicos en LATAM". Bien: "Visa apuesta por real-time payments mientras Mexico avanza en open banking". El titulo debe capturar la sustancia, no ser una etiqueta generica.

REGLAS DE TONO — MUY IMPORTANTE:
- NUNCA uses: "debemos", "deberiamos", "tenemos que", "necesitamos", "hay que actuar", "es urgente", "amenaza", "nos pone en jaque", "rivalizando directamente", "amenaza directa"
- NUNCA escribas como si Fintoc estuviera en peligro o necesitara reaccionar con urgencia
- NUNCA uses framing competitivo agresivo ("rivalizando con nuestras soluciones", "compitiendo directamente contra nosotros")
- NUNCA incluyas recomendaciones de accion ("deberiamos acelerar X", "hay que lanzar Y")
- El newsletter es INFORMATIVO. Cuenta que paso, por que es interesante, y punto.
- Si algo es relevante para el ecosistema fintech, mencionalo de forma observacional, no prescriptiva.

AUDIENCIA: Todo el equipo de Fintoc (~50 personas). Deben poder leerlo en 3 minutos y salir con una idea clara de que esta pasando en la industria.

Secciones disponibles para section_assignments:
${SECTIONS}

Responde UNICAMENTE con JSON valido (sin markdown, sin backticks):
{
  "tema_semana": "<titulo que capture el tema central de la semana>",
  "content_md": "<newsletter en Markdown>",
  "content_slack": "<version Slack en mrkdwn, max 3800 chars>",
  "section_assignments": [
    { "signal_id": "<id>", "section": "<section_id>", "sort_order": <numero> }
  ]
}

FORMATO del content_md:

# Strategy Intel Weekly — [Tema de la semana]
_Semana del [fecha]_

## [Titulo del Tema 1 — descriptivo e interesante]
[1-2 lineas de contexto: que paso concretamente, quien lo hizo, cifras si hay]
[1-2 lineas de por que es interesante o relevante para la industria fintech]
_Fuente: [link]_

## [Titulo del Tema 2]
[Mismo formato: contexto + relevancia]
_Fuente: [link]_

## [Titulo del Tema 3 — solo si realmente aporta]
[Mismo formato]
_Fuente: [link]_

:mag: *Y esto que significa para el ecosistema?*
[Un parrafo de 3-5 lineas, denso y observacional, conectando los temas de la semana con tendencias del ecosistema fintech LATAM. NO un resumen de los temas anteriores. Si hay un patron entre los temas, nombralo. Si las noticias apuntan a una tendencia mas amplia (ej. consolidacion de pagos en tiempo real, mayor regulacion de open banking, entrada de jugadores globales), explicala con sustancia. Tono: analista informado que conecta puntos. NUNCA prescriptivo ("deberiamos", "hay que"). NUNCA defensivo ("nos pone en riesgo"). SI observacional ("la convergencia entre X e Y sugiere que..."). Si los temas no se conectan claramente con una tendencia, di poco — vale mas un parrafo corto y honesto que uno largo y forzado.]

---
_Strategy Intel — Fintoc | [N] fuentes analizadas esta semana_

FORMATO del content_slack (max 3800 chars):

Usa este formato exacto con emojis y mrkdwn de Slack:

:newspaper: *Strategy Intel Weekly — [Tema de la semana]* :newspaper:
_Semana del [fecha]_

:one: *[Titulo especifico Tema 1 — captura la sustancia]*
[2-3 lineas con TODOS los datos concretos que aparezcan en la signal: quien, que hizo, cuando, donde, montos, %, cifras. Si la signal no tiene cifras, describe cualitativamente. NO INVENTES datos.]
<url|:link: Fuente>

:two: *[Titulo especifico Tema 2]*
[2-3 lineas con datos concretos. NO INVENTES.]
<url|:link: Fuente>

:three: *[Titulo especifico Tema 3]*
[Solo si aporta. 2-3 lineas con datos concretos. NO INVENTES.]
<url|:link: Fuente>

:mag: *Y esto que significa para el ecosistema?*
[Parrafo de 3-5 lineas, observacional y denso. Conecta los temas con tendencias mas amplias del ecosistema fintech LATAM. Sin "debemos" ni "hay que". Si no hay conexion clara, mejor decir poco.]

---
:robot_face: _Strategy Intel — Fintoc | [N] fuentes_`;

export async function generateNewsletter(signals: SignalForNewsletter[]): Promise<NewsletterContent> {
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

  const userMessage = `Genera el newsletter de la semana del ${dateStr}.

Hay ${signals.length} signals curadas. Tu trabajo NO es mencionar todas. Selecciona las 2-3 mas importantes y desarrollalas bien.

${signalsSummary}

INSTRUCCIONES CRITICAS:
- MAXIMO 3 temas. Si hay 30 signals, igual son maximo 3 temas. Agrupa signals relacionadas bajo un mismo tema SI son realmente del mismo tema. Si son noticias distintas, tratalas por separado.
- Cada tema DEBE tener suficiente contexto para que el lector entienda que paso sin tener que buscar mas informacion.
- Priorizar signals con impact_level "high" y publicadas esta semana.
- Si una signal tiene fecha > 10 dias, NO usarla como tema principal. Puede ser contexto.
- Priorizar regiones CL y MX. Maximo 1 tema global.
- El content_slack debe ser compacto (max 3800 chars) pero con contexto suficiente por tema.
- Es mejor un newsletter corto e informativo que uno largo y vacio.

RECORDATORIO DE TONO — LEE ESTO:
- NO escribas "debemos", "deberiamos", "tenemos que", "necesitamos", "hay que"
- NO escribas como si algo fuera una amenaza o emergencia
- NO hagas recomendaciones de accion
- NO uses "Para nosotros" ni "nuestras soluciones" ni "rivalizando directamente"
- SI escribe de forma informativa, interesante y observacional
- Imagina que le estas contando noticias interesantes a un amigo que trabaja en fintech. Informas, no alarmas.

RECORDATORIO DE DATOS — LEE ESTO:
- NUNCA inventes cifras, montos, porcentajes, fechas o nombres que no esten en las signals
- Extrae TODOS los datos concretos que SI esten en las signals (en el campo "Hecho")
- Si una signal es vaga ("Mastercard esta facilitando pagos"), no la rellenes con datos inventados — describela como esta o no la uses como tema principal
- Mejor un newsletter corto y veridico que uno largo y especulativo
- Los titulos deben ser ESPECIFICOS, no etiquetas genericas. "Visa compra YellowPepper para entrar a real-time payments" > "Movimientos en LATAM"
- El parrafo de ecosistema debe tener sustancia: conecta los temas con tendencias del ecosistema, no resumas lo ya dicho`;

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
  const minTopics = 2;
  const hasTopics = topicCount >= minTopics;
  checks.push({
    id: 'min_topics',
    pass: hasTopics,
    level: 'fail',
    detail: `${topicCount}/${minTopics} temas desarrollados`,
  });
  if (!hasTopics) errors.push(`Minimo ${minTopics} temas desarrollados requeridos`);

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

  // Check for forbidden prescriptive language
  const forbiddenPatterns = /debemos|deber[ií]amos|tenemos que|necesitamos|hay que actuar|amenaza directa|nos pone en jaque|rivalizando directamente/gi;
  const hasForbiddenLanguage = forbiddenPatterns.test(content.content_slack) || forbiddenPatterns.test(content.content_md);
  checks.push({
    id: 'no_prescriptive_language',
    pass: !hasForbiddenLanguage,
    level: 'warn',
    detail: hasForbiddenLanguage ? 'Contiene lenguaje prescriptivo o alarmista' : 'Tono correcto',
  });
  if (hasForbiddenLanguage) warnings.push('El newsletter contiene lenguaje prescriptivo o alarmista que deberia ser revisado');

  return {
    valid: errors.length === 0,
    checks,
    errors,
    warnings,
  };
}
