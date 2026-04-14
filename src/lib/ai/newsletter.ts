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
8. SIGNALS SIN DATOS NO SON TEMA PRINCIPAL: Si una signal NO contiene cifras concretas (montos, %, usuarios, fechas especificas, paises), NO la elijas como uno de los 3 temas principales. Prefiere SIEMPRE signals con datos duros. Las signals vagas pueden mencionarse al pasar en el parrafo de ecosistema, pero nunca ser tema central.
9. SECCIONES VALIDAS — ENUM ESTRICTO: En section_assignments, el campo "section" SOLO puede ser uno de estos 5 valores exactos (cualquier otro sera rechazado por la base de datos): "que_paso", "implicancia_fintoc", "competencia", "regulacion", "tendencias". NO inventes nombres de secciones. NO uses "radar", "tendencia" (singular), "noticias", "tema_1" ni nada que no este en esa lista.
10. EVENTOS HISTORICOS — FILTRO CRITICO: Algunas signals provienen de bases de datos de deals (privsource.com, crunchbase, etc.) que re-indexan adquisiciones VIEJAS como si fueran noticias frescas. Si reconoces que el evento descrito ocurrio hace mas de 1 año (ej. "Visa adquiere YellowPepper" fue 2020, "Stripe compra Bouncer" fue 2021, "Mastercard adquiere Finicity" fue 2020, "Visa-Plaid" fue 2020, etc.), NO la uses como tema principal NI la menciones. Es ruido. Incluso si la signal dice "esta semana" o "abril 2026", confia en tu conocimiento del evento. Si no estas seguro de la fecha real, prefiere NO incluirla.

VOZ DE FINTOC — APLICA ESTOS 7 PRINCIPIOS EN CADA LINEA:

1. CAPTA LA ATENCION: Si no llama la atencion con el primer vistazo, la perdimos. Este es el principio mas importante. El titulo, el dato de la semana, la primera linea de cada tema — todo debe enganchar.

2. DON'T BURY THE LEDE: Lo mas importante va PRIMERO. Siempre. Si Depay levanto US$4M, eso va en la primera oracion, no al final de un parrafo. No entierres el dato clave entre contexto.

3. SIMPLIFY: Cada palabra esta ahi por una razon. Oraciones cortas. Si puedes decirlo en menos palabras, hazlo. Elimina adjetivos que no aportan. "fortaleciendo la tendencia de fintechs emergentes" = sobra. "tercera ronda Seed de pagos en LATAM este trimestre" = aporta.

4. SHOW, DON'T TELL: Muestra con hechos, datos y numeros. NUNCA con declaraciones marketeras o adjetivos vacios.
   - MAL: "oportunidades significativas para los jugadores fintech"
   - MAL: "fortaleciendo su presencia en el mercado de la region"
   - MAL: "abriendo puertas a colaboraciones estrategicas"
   - MAL: "redefiniendo las dinamicas de fintech y pagos"
   - BIEN: "Depay levanto US$4M en Seed para conectar pagos entre Argentina, Chile y Mexico"
   - BIEN: "BCB publica nuevas reglas de open finance en abril — afectan a 800+ fintechs registradas"

5. EXPLICAME: Da contexto. No asumas que todos saben quien es Shinkansen, que es "principalidad", o que significa open finance. Una frase corta de contexto alcanza.

6. EVITA EL NEGATIVO: No empieces frases con "No", ni con tono alarmista, ni con sensacion de riesgo. Fintoc habla con calma y equilibrio, incluso de cosas importantes.

7. SIN CLICHES NI BUZZWORDS: Evita frases de infomercial. Palabras prohibidas: "revolucion", "innovador", "disruptivo", "dinamico", "lider", "vanguardia", "transformador", "oportunidades significativas", "soluciones integrales", "ecosistema en crecimiento". Si suena a post de LinkedIn generico, reescribelo.

TONO FINTOC:
- Formal pero no rigido. Cercano, nunca de "usted".
- Mas serio que jugueton. Algun emoji para desaplanar, con medida.
- Apasionado pero calmado. Transmite con equilibrio, no con urgencia.
- Rebelde por dentro, mesurado por fuera. Cuando hay opinion, va con fundamento.
- NUNCA en primera persona ("creo", "me parece", "nos preguntamos"). Lo envia una app, no una persona.
- NUNCA prescriptivo ("debemos", "deberiamos", "hay que", "tenemos que", "necesitamos").
- NUNCA alarmista ("amenaza", "urgente", "nos pone en jaque", "rivalizando directamente").
- NUNCA menciones a Fintoc en el cuerpo de las noticias. El newsletter NO dice "esto podria afectar a Fintoc", "estrategias de entrada para empresas como Fintoc", "guiar los esfuerzos de Fintoc". El newsletter informa sobre la INDUSTRIA, no sobre Fintoc. Fintoc solo aparece en el footer ("Strategy Intel — Fintoc").
- NUNCA uses frases vacias tipo "esto podria influir en el desarrollo de nuevos productos" o "esta iniciativa podria guiar esfuerzos". Si no tienes datos concretos sobre el impacto, no lo menciones. Show don't tell.

AUDIENCIA: Todo el equipo de Fintoc (~50 personas). Deben poder escanearlo en 30 segundos y leerlo en profundidad en 3 minutos. Cada frase tiene que ganarse su lugar.

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

**Dato de la semana:** [Una cifra o dato destacado de las signals de esta semana, presentado con formato bold y contexto breve. Ej: "US$4M levantados por Depay en su Seed — la tercera ronda de pagos cross-border en LATAM este trimestre." Debe ser el dato mas memorable y tuiteable. Si ninguna signal tiene un dato fuerte, omitir esta seccion.]

## [Titulo del Tema 1 — EL MAS IMPORTANTE, desarrollo profundo]
[3-5 lineas de desarrollo real: que paso concretamente, quien lo hizo, cifras, contexto de la empresa/regulador, por que importa para la industria. Este tema lleva MAS profundidad que los otros. Incluir contexto que el lector no tendria solo con el titular: tamaño de la empresa, mercados donde opera, competidores relevantes, tendencia a la que pertenece.]
_Fuente: [link]_

## En el radar
- **[Titulo corto Tema 2]** — [1-2 lineas compactas con lo esencial: que paso + por que importa, en formato de bullet denso] _([Fuente](url))_
- **[Titulo corto Tema 3]** — [1-2 lineas compactas. Solo si aporta.] _([Fuente](url))_

:brain: *Lo que queda dando vueltas*
[Una pregunta o provocacion que conecte los temas. REGLAS ESTRICTAS:
- NO empieces resumiendo ("La inversion en X y la entrada de Y resaltan..." = PROHIBIDO. Eso es resumen, no provocacion).
- EMPIEZA directo con la tension o pregunta. Lede primero.
- Nombra actores especificos, no categorias genericas ("Colombia le pide a Brasil abrir Pix" > "los paises avanzan hacia la cooperacion").
- Formula como tension sin resolver o pregunta con dientes. "¿como impactaran estas iniciativas?" = demasiado generico. "Colombia quiere Pix regional, pero Brasil nunca ha abierto su infra domestica. ¿Que le haria cambiar de opinion?" = especifico y provocador.
- NO uses cliches: "plantea preguntas interesantes", "resaltan la creciente importancia", "convergencia regulatoria" sin explicar que significa concretamente.
- Minimo 40 palabras. Debe generar ganas de responder en el thread.]

---
_Strategy Intel — Fintoc | [N] fuentes analizadas esta semana_

FORMATO del content_slack (max 3800 chars):

Usa este formato exacto con emojis y mrkdwn de Slack:

:newspaper: *Strategy Intel Weekly — [Tema de la semana]* :newspaper:
_Semana del [fecha]_

:bar_chart: *Dato de la semana:* [Una cifra destacada con contexto. Ej: "*US$4M* levantados por Depay en su Seed — la tercera ronda de pagos cross-border en LATAM este trimestre." Si ninguna signal tiene dato fuerte, omitir.]

━━━━━━━━━━━━━━━━━━━━

:pushpin: *[Titulo especifico Tema 1 — EL PRINCIPAL]*
[3-5 lineas de desarrollo: que paso, quien, cifras, contexto de la empresa/regulador, por que importa. Este tema tiene MAS profundidad que los otros. El lector debe entender la noticia completa sin abrir el link. Incluir contexto que no esta en el titular: tamaño, mercados, competidores, tendencia a la que pertenece. TODOS los datos de la signal. NO INVENTES.]
<url|:link: Fuente>

━━━━━━━━━━━━━━━━━━━━

:satellite: *En el radar*
• *[Titulo corto Tema 2]* — [1-2 lineas compactas: que paso + relevancia. Con datos si los hay. NO INVENTES.] <url|:link: Fuente>
• *[Titulo corto Tema 3]* — [Solo si aporta. 1-2 lineas compactas.] <url|:link: Fuente>

━━━━━━━━━━━━━━━━━━━━

:brain: *Lo que queda dando vueltas*
[Una pregunta o provocacion estrategica que conecte los temas de la semana. NO es un resumen de lo anterior. NO es prescriptivo ("debemos", "hay que"). Es una observacion que invita a pensar, formulada como pregunta abierta o tension sin resolver. Debe generar ganas de responder en el thread. Minimo 40 palabras, idealmente 50-70.

Ejemplos del tono buscado (NO copies — son ilustrativos):
- "Brasil y Mexico avanzan hacia open finance por caminos distintos. ¿Terminaran convergiendo en un estandar regional, o la fragmentacion se convierte en oportunidad para quien conecte ambos mundos?"
- "El capital sigue fluyendo a infra de pagos, pero la capa de identidad financiera en LATAM sigue sin dueño. ¿Quien la construye primero define las reglas del juego?"]

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

  // Score-based data richness (0-3). >=1 qualifies as "has hard data".
  // 0 = pure narrative (vague), 1 = some concrete element, 2-3 = strong data.
  const dataScore = (text: string): number => {
    if (!text) return 0;
    const t = text.toLowerCase();
    let score = 0;
    // Monetary
    if (/(us\$|usd|u\$s|\$\s?\d|clp|mxn|brl|cop|pen|ars)\s?\d/.test(t)
        || /\d+\s?(millon|millones|mil millones|billon|billones|bn|mm)/.test(t)) score++;
    // Percentage
    if (/\d+([.,]\d+)?\s?%/.test(t)) score++;
    // Counts with units
    if (/\d{2,}[.,]?\d*\s?(usuarios|clientes|tarjetas|comercios|empresas|transacciones|operaciones|cuentas|pa[ií]ses|fintechs?|sucursales)/.test(t)) score++;
    // Deal verbs with number
    if (/(adquir|compr|invierte|invirti|levant|recaud|recauda|raise|funding|serie [a-d]|seed|round)/.test(t) && /\d/.test(t)) score++;
    // Named entity + concrete action (regulator, product launch, official announcement)
    if (/(banco central|bcb|cnv|cmf|sbs|sbif|condusef|cofece|banxico|bcra|sec|cnbv)/.test(t)) score++;
    // Specific date markers (months, quarters)
    if (/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|q[1-4]\s?20\d{2})/.test(t)) score++;
    return score;
  };
  const hasHardData = (text: string) => dataScore(text) >= 1;

  const signalsSummary = signals.map((s, i) => {
    const dataRich = hasHardData(s.summary_factual);
    return `
Signal ${i + 1} (id: ${s.id}):
- Tipo: ${s.signal_type} | Impacto: ${s.impact_level} | Horizonte: ${s.horizon}
- Datos duros: ${dataRich ? 'SI (apta como tema principal)' : 'NO (solo apta como contexto / ecosistema)'}
- Hecho: ${s.summary_factual}
- Implicancia Fintoc: ${s.fintoc_implication}
- Fuente: ${s.supporting_source} (${s.supporting_url})
- Publicado: ${s.supporting_published_at}
- Evidencia debil: ${s.low_evidence ? 'Si' : 'No'}
`;
  }).join('\n');

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
  const dateStr = weekStart.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });

  const userMessage = `Genera el newsletter de la semana del ${dateStr}.

Hay ${signals.length} signals curadas. Tu trabajo NO es mencionar todas. Selecciona 1 tema principal (el mas importante) para desarrollar en profundidad, y 1-2 temas secundarios para "En el radar" (formato bullet compacto).

${signalsSummary}

INSTRUCCIONES CRITICAS:
- FORMATO "1 GRANDE + 2 RAPIDAS": El tema principal (el mas importante, con mas datos, mas relevancia) va desarrollado en profundidad (3-5 lineas). Los otros 1-2 temas van como bullets compactos en "En el radar" (1-2 lineas cada uno). Agrupa signals relacionadas bajo un mismo tema SI son realmente del mismo tema.
- Cada tema DEBE tener suficiente contexto para que el lector entienda que paso sin tener que buscar mas informacion.
- Priorizar signals con impact_level "high" y publicadas esta semana.
- REGLA DE FECHA — ESTRICTA: Si "Publicado" es mayor a 10 dias antes de hoy, NO la uses como tema principal bajo ninguna circunstancia. Solo puede aparecer como contexto en el parrafo de ecosistema.
- REGLA DE DATOS — ESTRICTA: Si "Datos duros" dice "NO", esa signal NO puede ser tema principal. Solo se admiten como temas principales signals con "Datos duros: SI".
- REGLA DE EVENTOS HISTORICOS: Si reconoces que el evento descrito en la signal ocurrio hace mas de 1 año (deals como Visa-YellowPepper 2020, Mastercard-Finicity 2020, Visa-Plaid 2020, Stripe-Bouncer 2021, etc.), DESCARTALA totalmente. Las bases de deals tipo privsource re-indexan adquisiciones viejas como si fueran nuevas — no caigas en la trampa.
- Priorizar regiones CL y MX. Maximo 1 tema global.
- El content_slack debe ser compacto (max 3800 chars). El tema principal lleva profundidad; los del radar son compactos.
- Incluye "Dato de la semana" al inicio si hay una cifra memorable (monto, %, conteo). Si no hay, omitelo.
- El cierre "Lo que queda dando vueltas" debe ser una pregunta o provocacion que conecte los temas. NO resumas, NO prescribas. Invita a pensar.
- Es mejor un newsletter corto y provocador que uno largo y plano.

RECORDATORIO DE VOZ FINTOC — LEE ESTO:
- CAPTA LA ATENCION: ¿La primera linea de cada tema engancha? Si no, reescribela.
- DON'T BURY THE LEDE: El dato mas importante va en la PRIMERA oracion de cada tema. No al final.
- SIMPLIFY: Lee cada oracion. ¿Puedes decirlo en menos palabras? Hazlo. Elimina adjetivos vacios.
- SHOW DON'T TELL: Hechos y cifras, NO adjetivos marketeros. "oportunidades significativas" = PROHIBIDO. "US$4M Seed" = CORRECTO.
- NO primera persona. NO prescriptivo. NO alarmista. NO buzzwords.
- CLICHES PROHIBIDOS: "oportunidades significativas", "fortaleciendo su presencia", "abriendo puertas", "redefiniendo las dinamicas", "ecosistema en crecimiento", "jugadores fintech", "soluciones integradas/integrales", "presencia en el mercado de la region", "colaboraciones estrategicas", "cambiar el panorama", "nuevos jugadores", "empresas establecidas", "esto podria influir", "guiar los esfuerzos". Si una frase suena a LinkedIn generico, reescribela con datos concretos o eliminala.
- FINTOC NO SE MENCIONA EN EL CUERPO: Nunca escribas "empresas como Fintoc", "esto afecta a Fintoc", "para Fintoc esto significa". El newsletter cubre la industria, no a Fintoc.

RECORDATORIO DE DATOS — LEE ESTO:
- NUNCA inventes cifras, montos, porcentajes, fechas o nombres que no esten en las signals
- Extrae TODOS los datos concretos que SI esten en las signals (en el campo "Hecho")
- Si una signal es vaga ("Mastercard esta facilitando pagos"), no la rellenes con datos inventados — describela como esta o no la uses como tema principal
- Mejor un newsletter corto y veridico que uno largo y especulativo
- Los titulos deben ser ESPECIFICOS, no etiquetas genericas. "Visa compra YellowPepper para entrar a real-time payments" > "Movimientos en LATAM"
- La seccion "Lo que queda dando vueltas" es OBLIGATORIA y debe tener MINIMO 40 palabras (idealmente 50-70). NO es un resumen. Es una pregunta o provocacion que conecta los temas e invita a discutir en el thread. Formulada como pregunta abierta o tension sin resolver.
- En section_assignments usa SOLO estos 5 valores en "section": "que_paso", "implicancia_fintoc", "competencia", "regulacion", "tendencias". Cualquier otro valor sera rechazado por la base de datos.`;

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

  // Check for buzzwords/clichés (Fintoc voice guidelines)
  const buzzwordPatterns = /oportunidades significativas|fortaleciendo su presencia|abriendo puertas|redefiniendo las din[aá]micas|ecosistema en crecimiento|soluciones integrales|soluciones integradas|colaboraciones estrat[eé]gicas|jugadores fintech|presencia en el mercado de la regi[oó]n|cambiar el panorama|nuevos jugadores|empresas establecidas|esto podr[ií]a influir|guiar los esfuerzos|empresas como fintoc|esto afecta a fintoc|para fintoc esto/gi;
  const hasBuzzwords = buzzwordPatterns.test(content.content_slack);
  checks.push({
    id: 'no_buzzwords',
    pass: !hasBuzzwords,
    level: 'warn',
    detail: hasBuzzwords ? 'Contiene cliches o buzzwords (voz Fintoc)' : 'Sin cliches detectados',
  });
  if (hasBuzzwords) warnings.push('El newsletter contiene frases cliche que no van con la voz de Fintoc. Revisar: oportunidades significativas, fortaleciendo su presencia, abriendo puertas, etc.');

  // Check "Lo que queda dando vueltas" closing section — must be substantive and provocative.
  const closingMatch = content.content_slack.match(/Lo que queda dando vueltas\*([\s\S]*?)(?=\n---|\n:robot|$)/i);
  const closingText = closingMatch ? closingMatch[1].trim() : '';
  const closingWordCount = closingText.split(/\s+/).filter(Boolean).length;
  const minClosingWords = 40;
  const closingOk = closingWordCount >= minClosingWords;
  checks.push({
    id: 'closing_section_length',
    pass: closingOk,
    level: 'warn',
    detail: `Cierre editorial: ${closingWordCount} palabras (minimo ${minClosingWords})`,
  });
  if (!closingOk) warnings.push(`El cierre "Lo que queda dando vueltas" tiene ${closingWordCount} palabras (minimo: ${minClosingWords}). Debe ser una provocacion estrategica que invite a discutir.`);

  // Check section_assignments use valid section IDs
  const validSectionIds: Set<string> = new Set(FINTOC_CONTEXT.newsletter.sections.map(s => String(s.id)));
  const invalidSections = content.section_assignments
    .map(sa => String(sa.section))
    .filter(sec => !validSectionIds.has(sec));
  const sectionsOk = invalidSections.length === 0;
  checks.push({
    id: 'valid_section_ids',
    pass: sectionsOk,
    level: 'warn',
    detail: sectionsOk
      ? 'Todas las secciones son validas'
      : `Secciones invalidas detectadas: ${[...new Set(invalidSections)].join(', ')}`,
  });
  if (!sectionsOk) warnings.push(`El LLM genero secciones no permitidas: ${[...new Set(invalidSections)].join(', ')}. Solo se aceptan: ${[...validSectionIds].join(', ')}`);

  return {
    valid: errors.length === 0,
    checks,
    errors,
    warnings,
  };
}
