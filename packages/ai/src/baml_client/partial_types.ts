/******************************************************************************
 *
 *  These types are used for streaming, for when an instance of a type
 *  is still being built up and any of its fields is not yet fully available.
 *
 ******************************************************************************/

export interface StreamState<T> {
  value: T;
  state: 'Pending' | 'Incomplete' | 'Complete';
}

export namespace partial_types {
  export interface AccessibilityReport {
    missing_alt_text?: boolean | null;
    contrast_issues?: (string | null)[];
    aria_labels_missing?: boolean | null;
    summary?: string | null;
  }

  export interface AltTextReport {
    missing_alt_text?: boolean | null;
    non_descriptive_alt_text?: boolean | null;
    affected_images?: number | null;
    suggestions?: (string | null)[];
    summary?: string | null;
  }

  export interface ArticleSchemaMarkupReport {
    schema_present?: boolean | null;
    missing_properties?: (string | null)[];
    recommendation?: string | null;
    benefit_for_llms?: string | null;
    example?: string | null;
    summary?: string | null;
  }

  export interface ContentClarityReport {
    complex_language?: boolean | null;
    verbose_sections?: (string | null)[];
    recommendation?: string | null;
    benefit_for_llms?: string | null;
    summary?: string | null;
  }

  export interface ContentStructure {
    headings?: Record<string, number | null> | null;
    semantic_tags?: (string | null)[];
    main_sections?: (string | null)[];
  }

  export interface ContrastReport {
    contrast_issues?: (string | null)[];
    contrast_ratios?: Record<string, number | null> | null;
    suggestions?: (string | null)[];
    summary?: string | null;
  }

  export interface DescriptiveAltTextReport {
    missing_alt_text?: boolean | null;
    non_descriptive_alt_text?: boolean | null;
    affected_images?: number | null;
    recommendation?: string | null;
    benefit_for_llms?: string | null;
    summary?: string | null;
  }

  export interface EEATReport {
    author_expertise?: boolean | null;
    credible_sources?: boolean | null;
    factual_accuracy?: boolean | null;
    contact_info_present?: boolean | null;
    https_enabled?: boolean | null;
    missing_signals?: (string | null)[];
    recommendation?: string | null;
    benefit_for_llms?: string | null;
    summary?: string | null;
  }

  export interface FAQSchemaMarkupReport {
    schema_present?: boolean | null;
    question_answer_pairs?: number | null;
    recommendation?: string | null;
    benefit_for_llms?: string | null;
    example?: string | null;
    summary?: string | null;
  }

  export interface FormAccessibilityReport {
    form_label_issues?: boolean | null;
    error_message_issues?: boolean | null;
    suggestions?: (string | null)[];
    summary?: string | null;
  }

  export interface H1TagReport {
    h1_present?: boolean | null;
    multiple_h1?: boolean | null;
    h1_text: (string | null) | null;
    recommendation?: string | null;
    benefit_for_llms?: string | null;
    summary?: string | null;
  }

  export interface HeadingHierarchyReport {
    skipped_levels?: boolean | null;
    illogical_structure?: boolean | null;
    problematic_headings?: (string | null)[];
    recommendation?: string | null;
    benefit_for_llms?: string | null;
    summary?: string | null;
  }

  export interface HeadingStructureReport {
    headings?: Record<string, number | null> | null;
    heading_texts?: Record<string, (string | null)[]> | null;
    suggestions?: (string | null)[];
    summary?: string | null;
  }

  export interface ImageInfo {
    src?: string | null;
    alt_text: (string | null) | null;
    descriptive?: boolean | null;
    decorative?: boolean | null;
  }

  export interface ImprovementSuggestions {
    seo?: (string | null)[];
    accessibility?: (string | null)[];
    performance?: (string | null)[];
    overall_priority?: (string | null)[];
  }

  export interface KeyboardAccessibilityReport {
    focus_indicators_missing?: boolean | null;
    tab_order_issues?: boolean | null;
    skip_link_missing?: boolean | null;
    suggestions?: (string | null)[];
    summary?: string | null;
  }

  export interface MainSectionsReport {
    main_sections?: (string | null)[];
    missing_sections?: (string | null)[];
    suggestions?: (string | null)[];
    summary?: string | null;
  }

  export interface SEOMetadata {
    meta_title: (string | null) | null;
    meta_description: (string | null) | null;
    canonical_url: (string | null) | null;
    og_title: (string | null) | null;
    og_description: (string | null) | null;
    twitter_card: (string | null) | null;
  }

  export interface SemanticElementsReport {
    overuse_generic_tags?: boolean | null;
    missing_semantic_elements?: (string | null)[];
    recommendation?: string | null;
    benefit_for_llms?: string | null;
    summary?: string | null;
  }

  export interface SemanticTagReport {
    semantic_tags?: (string | null)[];
    missing_semantic_tags?: (string | null)[];
    suggestions?: (string | null)[];
    summary?: string | null;
  }

  export interface UserIntentReport {
    addresses_user_intent?: boolean | null;
    missing_intent_areas?: (string | null)[];
    recommendation?: string | null;
    benefit_for_llms?: string | null;
    summary?: string | null;
  }

  export interface WebpageImagesReport {
    total_images?: number | null;
    images_info?: (partial_types.ImageInfo | null)[];
    missing_alt_count?: number | null;
    non_descriptive_alt_count?: number | null;
    decorative_images?: number | null;
    recommendation?: string | null;
    summary?: string | null;
  }

  export interface WebsiteScreenshotAnalysis {
    title: (string | null) | null;
    main_text: (string | null) | null;
    detected_elements?: (string | null)[];
    dominant_colors?: (string | null)[];
    language: (string | null) | null;
  }
}
