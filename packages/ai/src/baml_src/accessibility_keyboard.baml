// Keyboard navigation and focus accessibility analysis
class KeyboardAccessibilityReport {
  focus_indicators_missing bool @description("True if visible focus indicators are missing for interactive elements.")
  tab_order_issues bool @description("True if tab order appears illogical or inconsistent.")
  skip_link_missing bool @description("True if a skip-to-content or similar accessibility link is missing.")
  suggestions string[] @description("Suggestions for improving keyboard navigation and focus accessibility.")
  summary string @description("Summary of keyboard navigation and focus issues found.")
}

function AnalyzeKeyboardAccessibility(img: image) -> KeyboardAccessibilityReport {
  client "openai/gpt-4o"
  prompt #"
    {{_.role("user")}}
    Analyze this website screenshot image: {{ img }}
    Identify issues with keyboard navigation and focus accessibility, such as missing visible focus indicators, illogical tab order, or missing skip-to-content links.
    Provide suggestions for improvement and a summary of the main issues found.
    {{ ctx.output_format }}
  "#
}

test analyze_keyboard_accessibility_github {
  functions [AnalyzeKeyboardAccessibility]
  args {
    img {
      url "https://github.com/images/modules/site/home-campaign/hero-bg.webp"
    }
  }
}