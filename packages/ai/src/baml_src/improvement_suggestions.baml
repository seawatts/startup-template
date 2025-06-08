// Suggestions for improvement
class ImprovementSuggestions {
  seo string[] @description("Actionable SEO improvement suggestions.")
  accessibility string[] @description("Actionable accessibility improvement suggestions.")
  performance string[] @description("Actionable performance improvement suggestions.")
  overall_priority string[] @description("Prioritized list of most important actions.")
}

function SuggestImprovements(
  seo: SEOMetadata,
  accessibility: AccessibilityReport,
  structure: ContentStructure
) -> ImprovementSuggestions {
  client "openai/gpt-4o"
  prompt #"
    {{_.role("user")}}
    Given the following website analysis:
    SEO Metadata: {{ seo }}
    Accessibility: {{ accessibility }}
    Content Structure: {{ structure }}

    Provide actionable suggestions for:
    - SEO improvements
    - Accessibility enhancements
    - Performance optimizations

    Prioritize the most important actions for a developer to take.
    {{ ctx.output_format }}
  "#
}

test suggest_improvements_example {
  functions [SuggestImprovements]
  args {
    seo {
      meta_title "GitHub: Where the world builds software"
      meta_description "GitHub is where over 100 million developers shape the future of software."
      canonical_url "https://github.com/"
      og_title "GitHub"
      og_description "Build software better, together."
      twitter_card "summary_large_image"
    }
    accessibility {
      missing_alt_text false
      contrast_issues []
      aria_labels_missing false
      summary "No major accessibility issues detected."
    }
    structure {
      headings { h1 1, h2 3 }
      semantic_tags ["nav", "main", "footer"]
      main_sections ["Header", "Main content", "Footer"]
    }
  }
}