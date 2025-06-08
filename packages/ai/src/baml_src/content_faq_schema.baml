// FAQPage schema.org structured data markup analysis
class FAQSchemaMarkupReport {
  schema_present bool @description("True if FAQPage schema.org markup is detected.")
  question_answer_pairs int @description("Number of Question/Answer pairs detected in the schema.")
  recommendation string @description("Recommendation to implement FAQPage schema.org markup for pages with question and answer formats.")
  benefit_for_llms string @description("Explanation of how FAQPage schema helps LLMs identify questions and answers, making content more suitable for LLM-generated answers or FAQ-style results.")
  example string @description("Example of FAQPage schema.org markup.")
  summary string @description("Summary of FAQPage schema.org markup issues found.")
}

function AnalyzeFAQSchemaMarkup(img: image) -> FAQSchemaMarkupReport {
  client "openai/gpt-4o"
  prompt #"
    {{_.role("user")}}
    Analyze this website screenshot image: {{ img }}
    Detect if FAQPage schema.org structured data markup is present.
    If present, count the number of Question/Answer pairs in mainEntity.
    Provide a recommendation to implement FAQPage schema.org markup for pages with question and answer formats.
    Explain how FAQPage schema helps LLMs identify questions and answers, making content more suitable for LLM-generated answers or FAQ-style results.
    Provide an example of FAQPage schema.org markup.
    Provide a summary of the main FAQPage schema.org markup issues found.
    {{ ctx.output_format }}
  "#
}

test analyze_faq_schema_markup_github {
  functions [AnalyzeFAQSchemaMarkup]
  args {
    img {
      url "https://github.com/images/modules/site/home-campaign/hero-bg.webp"
    }
  }
}