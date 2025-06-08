// Structured output for website screenshot analysis
class WebsiteScreenshotAnalysis {
  title string? @description("Title of the web page, if detected from the screenshot.")
  main_text string? @description("Main visible text content detected in the screenshot.")
  detected_elements string[] @description("List of key UI elements or sections detected (e.g., navbar, footer, buttons, forms).")
  dominant_colors string[] @description("Dominant colors detected in the screenshot, as color names or hex codes.")
  language string? @description("Detected language of the main content.")
}

// Function to analyze a website screenshot image
function AnalyzeWebsiteScreenshot(img: image) -> WebsiteScreenshotAnalysis {
  client "openai/gpt-4o"
  prompt #"
    {{_.role("user")}}
    Analyze this website screenshot image: {{ img }}
    Extract:
    - The page title (if visible)
    - The main visible text content
    - List of key UI elements or sections (e.g., navbar, footer, buttons, forms)
    - Dominant colors (as color names or hex codes)
    - The detected language of the main content

    {{ ctx.output_format }}
  "#
}

// Test with a sample website screenshot image URL
test analyze_github_homepage {
  functions [AnalyzeWebsiteScreenshot]
  args {
    img {
      url "https://github.com/images/modules/site/home-campaign/hero-bg.webp"
    }
  }
}