// Color contrast accessibility analysis
class ContrastReport {
  contrast_issues string[] @description("List of detected color contrast issues with affected elements or areas.")
  contrast_ratios map<string, float> @description("Map of element/area to its contrast ratio if problematic.")
  suggestions string[] @description("Suggestions for improving color contrast.")
  summary string @description("Summary of color contrast issues found.")
}

function AnalyzeContrast(img: image) -> ContrastReport {
  client "openai/gpt-4o"
  prompt #"
    {{_.role("user")}}
    Analyze this website screenshot image: {{ img }}
    Identify areas or elements with insufficient color contrast between text and background.
    List the affected elements/areas and their contrast ratios if possible.
    Provide suggestions for improving color contrast and a summary of the main issues found.
    {{ ctx.output_format }}
  "#
}

test analyze_contrast_github {
  functions [AnalyzeContrast]
  args {
    img {
      url "https://github.com/images/modules/site/home-campaign/hero-bg.webp"
    }
  }
}