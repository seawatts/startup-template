// Article schema.org structured data markup analysis
class ArticleSchemaMarkupReport {
  schema_present bool @description("True if Article schema.org markup is detected.")
  missing_properties string[] @description("List of required properties (e.g., headline, author, datePublished) that are missing.")
  recommendation string @description("Recommendation to use Article schema.org markup for blog posts and news articles, including properties like headline, author, datePublished.")
  benefit_for_llms string @description("Explanation of how schema markup provides explicit, machine-readable information, enabling LLMs to accurately identify key details and enhance visibility in LLM-powered results.")
  example string @description("Example of Article schema.org markup.")
  summary string @description("Summary of schema.org markup issues found.")
}

function AnalyzeArticleSchemaMarkup(img: image) -> ArticleSchemaMarkupReport {
  client "openai/gpt-4o"
  prompt #"
    {{_.role("user")}}
    Analyze this website screenshot image: {{ img }}
    Detect if Article schema.org structured data markup is present.
    If present, check for key properties: headline, author, datePublished.
    List any missing required properties.
    Provide a recommendation to use Article schema.org markup for blog posts and news articles, including properties like headline, author, datePublished.
    Explain how schema markup provides explicit, machine-readable information, enabling LLMs to accurately identify key details and enhance visibility in LLM-powered results.
    Provide an example of Article schema.org markup.
    Provide a summary of the main schema.org markup issues found.
    {{ ctx.output_format }}
  "#
}

test analyze_article_schema_markup_github {
  functions [AnalyzeArticleSchemaMarkup]
  args {
    img {
      url "https://github.com/images/modules/site/home-campaign/hero-bg.webp"
    }
  }
}