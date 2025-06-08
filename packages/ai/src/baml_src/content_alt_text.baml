// Descriptive alt text for images analysis
class DescriptiveAltTextReport {
  missing_alt_text bool @description("True if any images are missing alt text.")
  non_descriptive_alt_text bool @description("True if any alt text is present but not descriptive enough.")
  affected_images int @description("Number of images affected by missing or non-descriptive alt text.")
  recommendation string @description("Recommendation to write detailed alt text for all meaningful images, describing what they depict and their context.")
  benefit_for_llms string @description("Explanation of how alt text allows LLMs to understand image content, contributing to richer comprehension and accessibility.")
  summary string @description("Summary of descriptive alt text issues found.")
}

function AnalyzeDescriptiveAltText(img: image) -> DescriptiveAltTextReport {
  client "openai/gpt-4o"
  prompt #"
    {{_.role("user")}}
    Analyze this website screenshot image: {{ img }}
    Detect if any images are missing alt text or have non-descriptive alt text.
    Count the number of affected images.
    Provide a recommendation to write detailed alt text for all meaningful images, describing what they depict and their context.
    Explain how alt text allows LLMs (especially multimodal ones) to understand image content, contributing to a richer overall comprehension of the page and improving accessibility.
    Provide a summary of the main descriptive alt text issues found.
    {{ ctx.output_format }}
  "#
}

test analyze_descriptive_alt_text_github {
  functions [AnalyzeDescriptiveAltText]
  args {
    img {
      url "https://github.com/images/modules/site/home-campaign/hero-bg.webp"
    }
  }
}