/**
 * Recursively partial type that can be null.
 *
 * @deprecated Use types from the `partial_types` namespace instead, which provides type-safe partial implementations
 * @template T The type to make recursively partial.
 */
export type RecursivePartialNull<T> = T extends object
  ? { [P in keyof T]?: RecursivePartialNull<T[P]> }
  : T | null;

export interface Checked<T, CheckName extends string = string> {
  value: T;
  checks: Record<CheckName, Check>;
}

export interface Check {
  name: string;
  expr: string;
  status: 'succeeded' | 'failed';
}

export function all_succeeded<CheckName extends string>(
  checks: Record<CheckName, Check>,
): boolean {
  return get_checks(checks).every((check) => check.status === 'succeeded');
}

export function get_checks<CheckName extends string>(
  checks: Record<CheckName, Check>,
): Check[] {
  return Object.values(checks);
}
export interface AccessibilityReport {
  missing_alt_text: boolean;
  contrast_issues: string[];
  aria_labels_missing: boolean;
  summary: string;
}

export interface AltTextReport {
  missing_alt_text: boolean;
  non_descriptive_alt_text: boolean;
  affected_images: number;
  suggestions: string[];
  summary: string;
}

export interface ArticleSchemaMarkupReport {
  schema_present: boolean;
  missing_properties: string[];
  recommendation: string;
  benefit_for_llms: string;
  example: string;
  summary: string;
}

export interface ContentClarityReport {
  complex_language: boolean;
  verbose_sections: string[];
  recommendation: string;
  benefit_for_llms: string;
  summary: string;
}

export interface ContentStructure {
  headings: Record<string, number>;
  semantic_tags: string[];
  main_sections: string[];
}

export interface ContrastReport {
  contrast_issues: string[];
  contrast_ratios: Record<string, number>;
  suggestions: string[];
  summary: string;
}

export interface DescriptiveAltTextReport {
  missing_alt_text: boolean;
  non_descriptive_alt_text: boolean;
  affected_images: number;
  recommendation: string;
  benefit_for_llms: string;
  summary: string;
}

export interface EEATReport {
  author_expertise: boolean;
  credible_sources: boolean;
  factual_accuracy: boolean;
  contact_info_present: boolean;
  https_enabled: boolean;
  missing_signals: string[];
  recommendation: string;
  benefit_for_llms: string;
  summary: string;
}

export interface FAQSchemaMarkupReport {
  schema_present: boolean;
  question_answer_pairs: number;
  recommendation: string;
  benefit_for_llms: string;
  example: string;
  summary: string;
}

export interface FormAccessibilityReport {
  form_label_issues: boolean;
  error_message_issues: boolean;
  suggestions: string[];
  summary: string;
}

export interface H1TagReport {
  h1_present: boolean;
  multiple_h1: boolean;
  h1_text?: string | null;
  recommendation: string;
  benefit_for_llms: string;
  summary: string;
}

export interface HeadingHierarchyReport {
  skipped_levels: boolean;
  illogical_structure: boolean;
  problematic_headings: string[];
  recommendation: string;
  benefit_for_llms: string;
  summary: string;
}

export interface HeadingStructureReport {
  headings: Record<string, number>;
  heading_texts: Record<string, string[]>;
  suggestions: string[];
  summary: string;
}

export interface ImageInfo {
  src: string;
  alt_text?: string | null;
  descriptive: boolean;
  decorative: boolean;
}

export interface ImprovementSuggestions {
  seo: string[];
  accessibility: string[];
  performance: string[];
  overall_priority: string[];
}

export interface KeyboardAccessibilityReport {
  focus_indicators_missing: boolean;
  tab_order_issues: boolean;
  skip_link_missing: boolean;
  suggestions: string[];
  summary: string;
}

export interface MainSectionsReport {
  main_sections: string[];
  missing_sections: string[];
  suggestions: string[];
  summary: string;
}

export interface SEOMetadata {
  meta_title?: string | null;
  meta_description?: string | null;
  canonical_url?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  twitter_card?: string | null;
}

export interface SemanticElementsReport {
  overuse_generic_tags: boolean;
  missing_semantic_elements: string[];
  recommendation: string;
  benefit_for_llms: string;
  summary: string;
}

export interface SemanticTagReport {
  semantic_tags: string[];
  missing_semantic_tags: string[];
  suggestions: string[];
  summary: string;
}

export interface UserIntentReport {
  addresses_user_intent: boolean;
  missing_intent_areas: string[];
  recommendation: string;
  benefit_for_llms: string;
  summary: string;
}

export interface WebpageImagesReport {
  total_images: number;
  images_info: ImageInfo[];
  missing_alt_count: number;
  non_descriptive_alt_count: number;
  decorative_images: number;
  recommendation: string;
  summary: string;
}

export interface WebsiteScreenshotAnalysis {
  title?: string | null;
  main_text?: string | null;
  detected_elements: string[];
  dominant_colors: string[];
  language?: string | null;
}
