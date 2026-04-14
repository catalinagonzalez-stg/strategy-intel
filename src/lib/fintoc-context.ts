/**
 * Fintoc Context — Company intelligence for newsletter personalization
 *
 * This module provides structured context about Fintoc's products, markets,
 * competitors, and strategic priorities. Used by the newsletter generation
 * pipeline to produce highly relevant, personalized content.
 */

export const FINTOC_CONTEXT = {
    company: {
          name: 'Fintoc',
          description: 'Infraestructura financiera API-first para Latinoamerica. Conecta apps con cuentas bancarias, facilita pagos y datos financieros.',
          founded: 2020,
          hq: 'Santiago, Chile',
          markets: ['CL', 'MX'] as const,
          expansion_targets: ['CO', 'PE', 'BR'] as const,
    },

    key_metrics: {
          users: '5M+',
          banks_connected: 8,
          bank_coverage: '99%',
          monthly_revenue_usd: '~380K',
          certifications: ['ISO 27001', 'PCI DSS'],
          main_market: 'Chile',
    },

    products: {
          smart_checkout: {
                  name: 'Smart Checkout',
                  description: 'Orquestador inteligente de pagos. Combina todos los metodos (tarjetas, transferencias, Apple Pay) en un solo checkout optimizado para conversion.',
                  category: 'acquiring',
                  icp: 'Empresas con e-commerce o pagos recurrentes que quieren maximizar conversion y reducir costos de procesamiento.',
                  pricing: 'Comision por transaccion (1.5-2.5%), sin fee mensual.',
                  competitors: ['Transbank', 'Mercado Pago', 'Flow', 'Kushki', 'Conekta'],
                  key_value: 'Unico checkout que orquesta A2A + tarjetas + wallets en un solo flujo, maximizando conversion.',
          },
          cards: {
                  name: 'Cards / Apple Pay',
                  description: 'Procesamiento de tarjetas de credito/debito + Apple Pay. Tokenizacion segura, 3DS2, multiadquirencia.',
                  category: 'acquiring',
                  icp: 'Comercios que necesitan aceptar tarjetas con alta tasa de aprobacion y menor costo.',
                  competitors: ['Transbank', 'Kushki', 'Stripe', 'Mercado Pago'],
                  key_value: 'Multiadquirencia inteligente: rutea cada transaccion al adquirente con mayor probabilidad de aprobacion.',
          },
          bank_transfers: {
                  name: 'Transferencias Bancarias (IdP)',
                  description: 'Pagos cuenta a cuenta (A2A) — Iniciacion de Pagos. El usuario paga directo desde su banco sin tarjeta.',
                  category: 'a2a',
                  icp: 'Empresas con tickets altos o que quieren evitar comisiones de tarjeta. Utilities, seguros, educacion.',
                  pricing: 'Comision fija por transaccion (~CLP 200-400), mucho menor que tarjetas.',
                  competitors: ['Khipu', 'Etpay', 'Toku'],
                  key_value: 'Costo 70-80% menor que tarjetas. Conexion directa con 8 bancos, 99% cobertura en Chile.',
          },
          subscriptions: {
                  name: 'Suscripciones (PAC)',
                  description: 'Cobros recurrentes automaticos via Pago Automatico de Cuentas. Mandato digital, sin tarjeta.',
                  category: 'recurring',
                  icp: 'SaaS, seguros, utilities, educacion — cualquier cobro recurrente.',
                  competitors: ['Khipu PAC', 'Transbank PAC', 'Reveniu'],
                  key_value: 'Mandato 100% digital, sin ir al banco. Menor churn que tarjetas (no vencen).',
          },
          charges: {
                  name: 'Cobros (Charges)',
                  description: 'Cobros directos desde cuenta bancaria del usuario. Para pagos puntuales o recurrentes con autorizacion.',
                  category: 'a2a',
                  icp: 'Fintech, lending, cobranza — empresas que necesitan debitar cuentas.',
                  competitors: ['Khipu', 'Banco directo'],
                  key_value: 'Debito directo con experiencia digital fluida y alta tasa de exito.',
          },
          business_accounts: {
                  name: 'Cuentas Empresariales (CPF)',
                  description: 'Cuentas de pago para empresas. Reciben, mantienen y dispersan fondos. Cuenta puente para flujos de pago.',
                  category: 'banking_infra',
                  icp: 'Marketplaces, plataformas, fintechs que necesitan mover dinero entre partes.',
                  competitors: ['Banco tradicional', 'dLocal'],
                  key_value: 'Infraestructura bancaria sin ser banco. Permite a plataformas mover dinero programaticamente.',
          },
          connections: {
                  name: 'Conexiones / Movimientos',
                  description: 'Open banking — lectura de cuentas bancarias (saldos, movimientos, identidad). Widget Link para conexion segura.',
                  category: 'open_banking',
                  icp: 'Fintechs de credito (scoring), PFM, contabilidad, verificacion de identidad.',
                  competitors: ['Belvo', 'Prometeo', 'Pluggy'],
                  key_value: 'Datos bancarios en tiempo real de 8 bancos en Chile. Base para scoring, verificacion, y enriquecimiento.',
          },
    },

    competitors: {
          direct: {
                  chile: ['Khipu', 'Etpay', 'Toku', 'Transbank', 'Klap'],
                  mexico: ['Conekta', 'Kushki', 'Clip'],
                  latam: ['Belvo', 'Prometeo', 'dLocal', 'EBANX', 'Mercado Pago'],
                  global: ['Stripe', 'Adyen', 'Plaid'],
          },
          categories: {
                  a2a_payments: ['Khipu', 'Etpay', 'Toku'],
                  open_banking: ['Belvo', 'Prometeo', 'Pluggy'],
                  acquiring: ['Transbank', 'Klap', 'Conekta', 'Kushki', 'Clip'],
                  payouts: ['dLocal', 'EBANX'],
                  infrastructure: ['Stripe', 'Adyen', 'Mercado Pago'],
          },
    },

    strategic_priorities: [
          'Crecimiento en Mexico — expansion de productos y clientes',
          'Consolidar liderazgo en pagos A2A en Chile',
          'Open Finance / Open Banking regulacion en CL y MX',
          'Smart Checkout — aumentar conversion vs tarjetas',
          'Cumplimiento regulatorio — CMF Chile, CNBV Mexico',
          'Reducir fraude en pagos digitales',
          'Instant payments rails — nuevas redes de pago en tiempo real',
        ],

    topics_by_relevance: {
          critical: ['a2a', 'open_banking', 'open_finance', 'payins', 'regulacion'],
          high: ['acquiring', 'payouts', 'instant_payments', 'fraude', 'competition'],
          medium: ['rails', 'kyc_aml', 'embedded_finance', 'card_networks'],
          low: ['lending', 'treasury', 'cross_border', 'crypto_stablecoin', 'funding', 'infra'],
    },

    regions_by_priority: {
          primary: ['CL', 'MX'],
          secondary: ['CO', 'PE', 'BR'],
          tertiary: ['LATAM', 'global'],
    },

    regulators: {
          CL: { name: 'CMF Chile', full: 'Comision para el Mercado Financiero' },
          MX: { name: 'CNBV Mexico', full: 'Comision Nacional Bancaria y de Valores' },
    },

    newsletter: {
          name: 'Strategy Intel Weekly',
          audience: 'Equipo de estrategia y liderazgo de Fintoc',
          tone: 'Profesional, conciso, orientado a accion. En espanol.',
          sections: [
            { id: 'que_paso', name: 'Que paso', description: 'Resumen ejecutivo de los eventos mas importantes de la semana' },
            { id: 'implicancia_fintoc', name: 'Implicancia Fintoc', description: 'Analisis de como cada evento impacta directamente a Fintoc' },
            { id: 'competencia', name: 'Movimientos de competencia', description: 'Actividad de competidores directos e indirectos' },
            { id: 'regulacion', name: 'Regulacion', description: 'Cambios regulatorios en mercados clave' },
            { id: 'tendencias', name: 'Tendencias', description: 'Tendencias emergentes en fintech LATAM' },
                ],
          validation_rules: {
                  min_sources: 3,
                  min_sections: 3,
                  must_include_regions: ['CL', 'MX'],
                  max_global_ratio: 0.3,
                  require_fintoc_implication: true,
                  preferred_horizon_days: 7,
          },
    },
} as const;

export type FintocProduct = keyof typeof FINTOC_CONTEXT['products'];
export type CompetitorCategory = keyof typeof FINTOC_CONTEXT.competitors.categories;

/**
 * Get a text summary of Fintoc context for LLM prompts
 */
export function getFintocContextPrompt(): string {
    const ctx = FINTOC_CONTEXT;
    const productDetails = Object.values(ctx.products).map(p =>
      `- ${p.name}: ${p.description}\n  Propuesta de valor: ${p.key_value}\n  Competidores: ${p.competitors.join(', ')}`
    ).join('\n');

    return `
## Contexto Fintoc

**Empresa:** ${ctx.company.description}
**Mercados activos:** ${ctx.company.markets.join(', ')}
**Mercados objetivo:** ${ctx.company.expansion_targets.join(', ')}
**Metricas clave:** ${ctx.key_metrics.users} usuarios, ${ctx.key_metrics.banks_connected} bancos, ${ctx.key_metrics.bank_coverage} cobertura, ~${ctx.key_metrics.monthly_revenue_usd} USD/mes, ${ctx.key_metrics.certifications.join(' + ')}

**CATALOGO DE PRODUCTOS FINTOC:**
${productDetails}

**Prioridades estrategicas:**
${ctx.strategic_priorities.map(p => `- ${p}`).join('\n')}

**Competidores directos:**
- Chile: ${ctx.competitors.direct.chile.join(', ')}
- Mexico: ${ctx.competitors.direct.mexico.join(', ')}
- LATAM: ${ctx.competitors.direct.latam.join(', ')}

**Reguladores clave:** ${Object.values(ctx.regulators).map(r => r.name).join(', ')}

**Newsletter:**
- Audiencia: ${ctx.newsletter.audience}
- Tono: ${ctx.newsletter.tone}
- Secciones: ${ctx.newsletter.sections.map(s => s.name).join(', ')}
- Reglas: Minimo ${ctx.newsletter.validation_rules.min_sources} fuentes, ${ctx.newsletter.validation_rules.min_sections} secciones. Siempre incluir CL y MX. Maximo ${Math.round(ctx.newsletter.validation_rules.max_global_ratio * 100)}% contenido global.

IMPORTANTE PARA "Lo que queda dando vueltas": Usa el catalogo de productos arriba para conectar noticias con productos especificos de Fintoc. Ejemplo: si una noticia habla de open banking, conecta con Conexiones/Movimientos. Si habla de pagos A2A, conecta con Transferencias Bancarias (IdP). Si habla de suscripciones o cobros recurrentes, conecta con Suscripciones (PAC). Siempre menciona el producto relevante y por que la noticia le afecta concretamente.
    `.trim();
}
