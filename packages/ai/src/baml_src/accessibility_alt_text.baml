// Alt text accessibility analysis
class AltTextReport {
  missing_alt_text bool @description("True if any images appear to be missing alt text.")
  non_descriptive_alt_text bool @description("True if any alt text is present but non-descriptive.")
  affected_images int @description("Number of images affected.")
  suggestions string[] @description("Suggestions for improving alt text.")
  summary string @description("Summary of alt text issues found.")
}

function AnalyzeAltText(img: image) -> AltTextReport {
  client "openai/gpt-4o"
  prompt #"
    {{_.role("user")}}
    Analyze this website screenshot image: {{ img }}
    Identify images that are missing alt text or have non-descriptive alt text (e.g., 'image', 'photo', 'logo').
    Count the number of affected images and provide suggestions for improvement.
    Provide a summary of the main alt text issues found.
    {{ ctx.output_format }}
  "#
}

test analyze_alt_text_github {
  functions [AnalyzeAltText]
  args {
    img {
      url "https://github.com/images/modules/site/home-campaign/hero-bg.webp"
    }
  }
}