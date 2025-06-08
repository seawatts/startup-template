// Content clarity and conciseness analysis
class ContentClarityReport {
  complex_language bool @description("True if overly complex or verbose language is detected.")
  verbose_sections string[] @description("List of sections or paragraphs that are verbose or complex.")
  recommendation string @description("Recommendation to use clear, straightforward language, break down complex ideas, and utilize lists and bullet points.")
  benefit_for_llms string @description("Explanation of how clear and concise content benefits LLMs in understanding, summarizing, and extracting key information.")
  summary string @description("Summary of content clarity and conciseness issues found.")
}

function AnalyzeContentClarity(img: image) -> ContentClarityReport {
  client "openai/gpt-4o"
  prompt #"
    {{_.role("user")}}
    Analyze this website screenshot image: {{ img }}
    Detect if the content uses overly complex language or is verbose.
    List any sections or paragraphs that are verbose or complex.
    Provide a recommendation to use clear, straightforward language, break down complex ideas, and utilize lists and bullet points.
    Explain how clear and concise content is easier for LLMs to understand, summarize, and extract key information from, leading to better representation in LLM-driven search or Q&A.
    Provide a summary of the main content clarity and conciseness issues found.
    {{ ctx.output_format }}
  "#
}

test analyze_content_clarity_github {
  functions [AnalyzeContentClarity]
  args {
    img {
      url "https://github.com/images/modules/site/home-campaign/hero-bg.webp"
    }
  }
}