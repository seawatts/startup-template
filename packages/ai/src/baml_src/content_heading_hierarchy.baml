// Logical heading hierarchy analysis (H2-H6)
class HeadingHierarchyReport {
  skipped_levels bool @description("True if heading levels are skipped (e.g., H2 to H4 without H3).")
  illogical_structure bool @description("True if heading structure is not sequential or logical.")
  problematic_headings string[] @description("List of headings or sections where hierarchy issues are detected.")
  recommendation string @description("Recommendation to use H2-H6 tags in a sequential and logical order to structure subtopics.")
  benefit_for_llms string @description("Explanation of how proper heading hierarchy benefits LLMs in understanding content organization.")
  summary string @description("Summary of heading hierarchy issues found.")
}

function AnalyzeHeadingHierarchy(img: image) -> HeadingHierarchyReport {
  client "openai/gpt-4o"
  prompt #"
    {{_.role("user")}}
    Analyze this website screenshot image: {{ img }}
    Detect if there are skipped heading levels (e.g., H2 to H4 without H3) or illogical heading structure (e.g., H4 before H3).
    List any problematic headings or sections.
    Provide a recommendation to use H2-H6 tags in a sequential and logical order to structure subtopics.
    Explain how proper heading hierarchy allows LLMs to understand the organization and relationship between different sections of content.
    Provide a summary of the main heading hierarchy issues found.
    {{ ctx.output_format }}
  "#
}

test analyze_heading_hierarchy_github {
  functions [AnalyzeHeadingHierarchy]
  args {
    img {
      url "https://github.com/images/modules/site/home-campaign/hero-bg.webp"
    }
  }
}