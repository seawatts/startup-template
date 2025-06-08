import type { partial_types } from '../partial_types';

export type StreamingServerTypes = {
  AnalyzeAccessibility: partial_types.AccessibilityReport;
  AnalyzeAltText: partial_types.AltTextReport;
  AnalyzeArticleSchemaMarkup: partial_types.ArticleSchemaMarkupReport;
  AnalyzeContentClarity: partial_types.ContentClarityReport;
  AnalyzeContentStructure: partial_types.ContentStructure;
  AnalyzeContrast: partial_types.ContrastReport;
  AnalyzeDescriptiveAltText: partial_types.DescriptiveAltTextReport;
  AnalyzeEEAT: partial_types.EEATReport;
  AnalyzeFAQSchemaMarkup: partial_types.FAQSchemaMarkupReport;
  AnalyzeFormAccessibility: partial_types.FormAccessibilityReport;
  AnalyzeH1Tag: partial_types.H1TagReport;
  AnalyzeHeadingHierarchy: partial_types.HeadingHierarchyReport;
  AnalyzeHeadingStructure: partial_types.HeadingStructureReport;
  AnalyzeKeyboardAccessibility: partial_types.KeyboardAccessibilityReport;
  AnalyzeMainSections: partial_types.MainSectionsReport;
  AnalyzeSemanticElements: partial_types.SemanticElementsReport;
  AnalyzeSemanticTags: partial_types.SemanticTagReport;
  AnalyzeUserIntent: partial_types.UserIntentReport;
  AnalyzeWebsiteScreenshot: partial_types.WebsiteScreenshotAnalysis;
  AssessWebpageImages: partial_types.WebpageImagesReport;
  ExtractSEOMetadata: partial_types.SEOMetadata;
  SuggestImprovements: partial_types.ImprovementSuggestions;
};
