// Heading structure analysis
class HeadingStructureReport {
  headings map<string, int> @description("Map of heading tags (h1, h2, etc.) to their counts.")
  heading_texts map<string, string[]> @description("Map of heading tags to the list of their text content.")
  suggestions string[] @description("Suggestions for improving heading structure and hierarchy.")
  summary string @description("Summary of heading structure issues found.")
}

function AnalyzeHeadingStructure(img: image) -> HeadingStructureReport {
  client "openai/gpt-4o"
  prompt #"
    {{_.role("user")}}
    Analyze this website screenshot image: {{ img }}
    Extract the heading structure (h1, h2, etc.), including the count and text of each heading.
    Provide suggestions for improving heading hierarchy and a summary of the main issues found.
    {{ ctx.output_format }}
  "#
}

test analyze_heading_structure_github {
  functions [AnalyzeHeadingStructure]
  args {
    img {
      url "https://github.com/images/modules/site/home-campaign/hero-bg.webp"
    }
  }
}