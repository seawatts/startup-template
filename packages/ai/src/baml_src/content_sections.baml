// Main sections/areas analysis
class MainSectionsReport {
  main_sections string[] @description("Main sections or areas of the page detected (e.g., header, hero, features, footer, sidebar, etc.).")
  missing_sections string[] @description("Recommended main sections that are missing.")
  suggestions string[] @description("Suggestions for improving page structure and sectioning.")
  summary string @description("Summary of main section issues found.")
}

function AnalyzeMainSections(img: image) -> MainSectionsReport {
  client "openai/gpt-4o"
  prompt #"
    {{_.role("user")}}
    Analyze this website screenshot image: {{ img }}
    List the main sections or areas of the page detected (e.g., header, hero, features, footer, sidebar, etc.).
    Identify any recommended main sections that are missing.
    Provide suggestions for improving page structure and a summary of the main issues found.
    {{ ctx.output_format }}
  "#
}

test analyze_main_sections_github {
  functions [AnalyzeMainSections]
  args {
    img {
      url "https://github.com/images/modules/site/home-campaign/hero-bg.webp"
    }
  }
}