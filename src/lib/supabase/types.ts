export type TopicEnum =
  | 'a2a' | 'rails' | 'payouts' | 'payins' | 'acquiring'
  | 'card_networks' | 'instant_payments' | 'open_banking'
  | 'open_finance' | 'regulacion' | 'fraude' | 'kyc_aml'
  | 'lending' | 'treasury' | 'cross_border' | 'crypto_stablecoin'
  | 'embedded_finance' | 'competition' | 'funding' | 'infra';

export type Region = 'CL' | 'MX' | 'BR' | 'CO' | 'PE' | 'LATAM' | 'global';
export type Bucket = 'payments_global' | 'infra_pagos' | 'regulacion' | 'latam_pais';
export type Confidence = 'high' | 'med' | 'low';
export type ArticleStatus = 'new' | 'excluded' | 'noise' | 'promoted';
export type EditionStatus = 'draft' | 'validated' | 'sent' | 'failed';
export type SignalType = 'regulation' | 'competition' | 'product' | 'infra' | 'funding' | 'social';
export type ImpactLevel = 'high' | 'med' | 'low';
export type Section = 'tendencia' | 'strategy' | 'radar' | 'senal_debil';

export interface Source {
  id: string;
  name: string;
  type: 'rss' | 'email' | 'serper' | 'slack' | 'twitter';
  url: string | null;
  config: Record<string, unknown>;
  active: boolean;
  created_at: string;
}

export interface Article {
  id: string;
  source_id: string | null;
  title: string;
  url: string | null;
  author: string | null;
  source_domain: string | null;
  content_snippet: string | null;
  content_text: string | null;
  content_hash: string | null;
  published_at: string | null;
  published_at_source: string | null;
  ingested_at: string;
  status: ArticleStatus;
  notes: string | null;
  excluded_reason: string | null;
  pinned: boolean;
  raw: Record<string, unknown> | null;
}

export interface Classification {
  id: string;
  article_id: string;
  relevance_score: number;
  topics: TopicEnum[];
  region: Region | null;
  bucket: Bucket | null;
  summary: string | null;
  evidence_quote: string | null;
  why_relevant_to_fintoc: string | null;
  confidence: Confidence | null;
  freshness_days: number | null;
  is_weekly_eligible: boolean;
  classification_model: string | null;
  created_at: string;
}

export interface Signal {
  id: string;
  article_id: string | null;
  signal_type: SignalType;
  impact_level: ImpactLevel | null;
  horizon: '0-3m' | '3-12m' | '12m+' | null;
  summary_factual: string;
  fintoc_implication: string;
  supporting_url: string;
  supporting_source: string;
  supporting_published_at: string;
  supporting_quote: string;
  low_evidence: boolean;
  edition_id: string | null;
  created_at: string;
}

export interface NewsletterEdition {
  id: string;
  edition_date: string;
  edition_number: number | null;
  tema_semana: string | null;
  status: EditionStatus;
  content_md: string | null;
  content_slack: string | null;
  validation_result: ValidationResult | null;
  sent_at: string | null;
  created_at: string;
}

export interface ValidationResult {
  valid: boolean;
  checks: Array<{ id: string; pass: boolean; level: 'fail' | 'warn'; detail: string }>;
  errors: string[];
  warnings: string[];
}

export interface NewsletterItem {
  id: string;
  edition_id: string;
  signal_id: string | null;
  article_id: string | null;
  section: Section | null;
  sort_order: number | null;
  editorial_text: string | null;
  supporting_url: string;
  supporting_source: string;
  supporting_published_at: string;
  supporting_quote: string;
  low_evidence: boolean;
}

export interface ArticleWithClassification extends Article {
  classifications: Classification[];
}
