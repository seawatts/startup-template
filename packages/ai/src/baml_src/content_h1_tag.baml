// H1 tag presence and clarity analysis
class H1TagReport {
  h1_present bool @description("True if an H1 tag is present on the page.")
  multiple_h1 bool @description("True if multiple H1 tags are detected.")
  h1_text string? @description("The text content of the H1 tag, if present.")
  recommendation string @description("Recommendation to use a single, descriptive H1 tag that accurately reflects the main content of the page.")
  benefit_for_llms string @description("Explanation of how a clear H1 helps LLMs quickly grasp the page's core subject, improving content understanding and relevance assessment.")
  summary string @description("Summary of H1 tag issues found.")
}

function AnalyzeH1Tag(img: image) -> H1TagReport {
  client "openai/gpt-4o"
  prompt #"
    {{_.role("user")}}
    Analyze this website screenshot image: {{ img }}
    Detect if there is a single, clear H1 tag. If present, extract its text. If missing or multiple H1 tags are found, note this as an issue.
    Provide a recommendation to use a single, descriptive H1 tag that accurately reflects the main content of the page.
    Explain how a clear H1 helps LLMs quickly grasp the page's core subject, improving content understanding and relevance assessment.
    Provide a summary of the main H1 tag issues found.
    {{ ctx.output_format }}
  "#
}

test analyze_h1_tag_github {
  functions [AnalyzeH1Tag]
  args {
    img {
      url "https://github.com/images/modules/site/home-campaign/hero-bg.webp"
    }
  }
}