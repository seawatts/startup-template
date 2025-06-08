// Semantic HTML tag usage analysis
class SemanticTagReport {
  semantic_tags string[] @description("List of semantic HTML tags detected (e.g., nav, main, footer, article, section).")
  missing_semantic_tags string[] @description("List of recommended semantic tags that are missing.")
  suggestions string[] @description("Suggestions for improving semantic HTML structure.")
  summary string @description("Summary of semantic tag usage issues found.")
}

function AnalyzeSemanticTags(img: image) -> SemanticTagReport {
  client "openai/gpt-4o"
  prompt #"
    {{_.role("user")}}
    Analyze this website screenshot image: {{ img }}
    List the semantic HTML tags detected (e.g., nav, main, footer, article, section).
    Identify any recommended semantic tags that are missing.
    Provide suggestions for improving semantic HTML structure and a summary of the main issues found.
    {{ ctx.output_format }}
  "#
}

test analyze_semantic_tags_github {
  functions [AnalyzeSemanticTags]
  args {
    img {
      url "https://github.com/images/modules/site/home-campaign/hero-bg.webp"
    }
  }
}