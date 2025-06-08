// Content structure analysis
class ContentStructure {
  headings map<string, int> @description("Map of heading tags (h1, h2, etc.) to their counts.")
  semantic_tags string[] @description("List of semantic HTML tags detected (e.g., nav, main, footer, article, section).")
  main_sections string[] @description("Main sections or areas of the page detected.")
}

function AnalyzeContentStructure(img: image) -> ContentStructure {
  client "openai/gpt-4o"
  prompt #"
    {{_.role("user")}}
    Analyze this website screenshot image: {{ img }}
    Extract the heading structure (h1, h2, etc.), semantic HTML tags, and main sections or areas of the page.
    {{ ctx.output_format }}
  "#
}

test analyze_content_structure_github {
  functions [AnalyzeContentStructure]
  args {
    img {
      url "https://github.com/images/modules/site/home-campaign/hero-bg.webp"
    }
  }
}