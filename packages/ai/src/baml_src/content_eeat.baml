// E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) analysis
class EEATReport {
  author_expertise bool @description("True if author expertise is demonstrated (e.g., author bio, credentials).")
  credible_sources bool @description("True if credible sources are cited.")
  factual_accuracy bool @description("True if content appears factually accurate.")
  contact_info_present bool @description("True if clear contact information is provided.")
  https_enabled bool @description("True if the site is secured with HTTPS.")
  missing_signals string[] @description("List of missing or weak E-E-A-T signals.")
  recommendation string @description("Recommendation to showcase author expertise, cite credible sources, ensure factual accuracy, provide clear contact information, and secure the site with HTTPS.")
  benefit_for_llms string @description("Explanation of how strong E-E-A-T signals improve how LLMs perceive and rank content.")
  summary string @description("Summary of E-E-A-T issues found.")
}

function AnalyzeEEAT(img: image) -> EEATReport {
  client "openai/gpt-4o"
  prompt #"
    {{_.role("user")}}
    Analyze this website screenshot image: {{ img }}
    Detect the presence or absence of E-E-A-T signals: author expertise (bio, credentials), credible sources, factual accuracy, clear contact information, and HTTPS security.
    List any missing or weak E-E-A-T signals.
    Provide a recommendation to showcase author expertise, cite credible sources, ensure factual accuracy, provide clear contact information, and secure the site with HTTPS.
    Explain how strong E-E-A-T signals improve how LLMs perceive and rank content.
    Provide a summary of the main E-E-A-T issues found.
    {{ ctx.output_format }}
  "#
}

test analyze_eeat_github {
  functions [AnalyzeEEAT]
  args {
    img {
      url "https://github.com/images/modules/site/home-campaign/hero-bg.webp"
    }
  }
}