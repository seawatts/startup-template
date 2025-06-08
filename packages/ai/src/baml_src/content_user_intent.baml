// User intent satisfaction analysis
class UserIntentReport {
  addresses_user_intent bool @description("True if the content clearly satisfies common user queries related to its topic.")
  missing_intent_areas string[] @description("List of areas or topics where user intent is not clearly addressed.")
  recommendation string @description("Recommendation to research common questions and intents related to your topics and structure content to provide direct, comprehensive answers.")
  benefit_for_llms string @description("Explanation of how content that directly addresses user intent is more likely to be surfaced and utilized by LLMs.")
  summary string @description("Summary of user intent satisfaction issues found.")
}

function AnalyzeUserIntent(img: image) -> UserIntentReport {
  client "openai/gpt-4o"
  prompt #"
    {{_.role("user")}}
    Analyze this website screenshot image: {{ img }}
    Detect if the content clearly satisfies common user queries related to its topic.
    List any areas or topics where user intent is not clearly addressed.
    Provide a recommendation to research common questions and intents related to your topics and structure content to provide direct, comprehensive answers.
    Explain how content that directly addresses user intent is more likely to be surfaced and utilized by LLMs.
    Provide a summary of the main user intent satisfaction issues found.
    {{ ctx.output_format }}
  "#
}

test analyze_user_intent_github {
  functions [AnalyzeUserIntent]
  args {
    img {
      url "https://github.com/images/modules/site/home-campaign/hero-bg.webp"
    }
  }
}