// Form accessibility analysis
class FormAccessibilityReport {
  form_label_issues bool @description("True if form fields are missing labels or have unclear labels.")
  error_message_issues bool @description("True if error messages are missing, unclear, or not visible.")
  suggestions string[] @description("Suggestions for improving form accessibility.")
  summary string @description("Summary of form accessibility issues found.")
}

function AnalyzeFormAccessibility(img: image) -> FormAccessibilityReport {
  client "openai/gpt-4o"
  prompt #"
    {{_.role("user")}}
    Analyze this website screenshot image: {{ img }}
    Identify form accessibility issues, such as missing or unclear labels for form fields, and missing or unclear error messages.
    Provide suggestions for improvement and a summary of the main issues found.
    {{ ctx.output_format }}
  "#
}

test analyze_form_accessibility_github {
  functions [AnalyzeFormAccessibility]
  args {
    img {
      url "https://github.com/images/modules/site/home-campaign/hero-bg.webp"
    }
  }
}