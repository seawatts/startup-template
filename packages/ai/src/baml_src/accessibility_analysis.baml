// Accessibility analysis
class AccessibilityReport {
  missing_alt_text bool @description("True if images appear to be missing alt text.")
  contrast_issues string[] @description("List of detected color contrast issues.")
  aria_labels_missing bool @description("True if ARIA labels are missing from key elements.")
  summary string @description("Summary of accessibility issues found.")
}

function AnalyzeAccessibility(img: image) -> AccessibilityReport {
  client "openai/gpt-4o"
  prompt #"
    {{_.role("user")}}
    Analyze this website screenshot image: {{ img }}
    Identify accessibility issues such as missing alt text, color contrast problems, and missing ARIA labels.
    Provide a summary of the main accessibility issues found.
    {{ ctx.output_format }}
  "#
}

test analyze_accessibility_github {
  functions [AnalyzeAccessibility]
  args {
    img {
      url "https://github.com/images/modules/site/home-campaign/hero-bg.webp"
    }
  }
}