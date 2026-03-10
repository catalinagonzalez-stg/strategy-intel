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

    products: {
          link: {
                  name: 'Fintoc Link',
                  description: 'Widget de conexion bancaria — permite a usuarios conectar sus cuentas bancarias de forma segura',
                  category: 'open_banking',
                  competitors: ['Belvo', 'Prometeo', 'Pluggy'],
          },
          payments: {
                  name: 'Fintoc Payments',
                  description: 'Pagos cuenta a cuenta (A2A) — transferencias bancarias directas sin tarjeta',
                  category: 'a2a',
                  competitors: ['Khipu', 'Etpay', 'Toku', 'Kushki'],
          },
          smart_checkout: {
                  name: 'Smart Checkout',
                  description: 'Checkout inteligente que combina multiples metodos de pago optimizando conversion',
                  category: 'acquiring',
                  competitors: ['Transbank', 'Conekta', 'Stripe', 'Mercado Pago'],
          },
          payouts: {
                  name: 'Fintoc Payouts',
                  description: 'Dispersiones masivas — pagos a proveedores, empleados, clientes',
                  category: 'payouts',
                  competitors: ['dLocal', 'EBANX', 'Payoneer'],
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

export type FintocProduct = keyof typeof FINTOC_CONTEXT.products;
export type CompetitorCategory = keyof typeof FINTOC_CONTEXT.competitors.categories;

/**
 * Get a text summary of Fintoc context for LLM prompts
 */
export function getFintocContextPrompt(): string {
    const ctx = FINTOC_CONTEXT;
    return `
    ## Contexto Fintoc

    **Empresa:** ${ctx.company.description}
    **Mercados activos:** ${ctx.company.markets.join(', ')}
    **Mercados objetivo:** ${ctx.company.expansion_targets.join(', ')}

    **Productos:**
    ${Object.values(ctx.products).map(p => `- ${p.name}: ${p.description}`).join('\n')}

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
    `.trim();
}
