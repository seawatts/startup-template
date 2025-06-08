// Semantic HTML5 elements usage analysis
class SemanticElementsReport {
  overuse_generic_tags bool @description("True if there is overuse of generic <div> and <span> tags.")
  missing_semantic_elements string[] @description("List of recommended semantic HTML5 elements that are missing or underused.")
  recommendation string @description("Recommendation to employ semantic HTML5 elements like <article>, <section>, <nav>, <aside>, <header>, and <footer> to define page structure.")
  benefit_for_llms string @description("Explanation of how semantic elements provide explicit meaning about content structure and purpose, enabling LLMs to better differentiate and understand various parts of the page.")
  summary string @description("Summary of semantic HTML5 element usage issues found.")
}

function AnalyzeSemanticElements(img: image) -> SemanticElementsReport {
  client "openai/gpt-4o"
  prompt #"
    {{_.role("user")}}
    Analyze this website screenshot image: {{ img }}
    Detect if there is overuse of generic <div> and <span> tags and underuse of semantic HTML5 elements.
    List any recommended semantic elements (<article>, <section>, <nav>, <aside>, <header>, <footer>) that are missing or underused.
    Provide a recommendation to employ semantic HTML5 elements to define page structure.
    Explain how semantic elements provide explicit meaning about content structure and purpose, enabling LLMs to better differentiate and understand various parts of the page (e.g., main content vs. sidebar).
    Provide a summary of the main semantic HTML5 element usage issues found.
    {{ ctx.output_format }}
  "#
}

test analyze_semantic_elements_github {
  functions [AnalyzeSemanticElements]
  args {
    img {
      url "https://github.com/images/modules/site/home-campaign/hero-bg.webp"
    }
  }
}