// SEO Metadata extraction
class SEOMetadata {
  meta_title string? @description("Meta title of the page, if visible.")
  meta_description string? @description("Meta description tag content, if visible.")
  canonical_url string? @description("Canonical URL, if present in the screenshot.")
  og_title string? @description("Open Graph title, if present.")
  og_description string? @description("Open Graph description, if present.")
  twitter_card string? @description("Twitter card type, if present.")
}

function ExtractSEOMetadata(img: image) -> SEOMetadata {
  client "openai/gpt-4o"
  prompt #"
    {{_.role("user")}}
    Extract SEO metadata from this website screenshot image: {{ img }}
    Look for meta title, meta description, canonical URL, Open Graph (og) tags, and Twitter card tags if visible.
    {{ ctx.output_format }}
  "#
}

test extract_seo_metadata_github {
  functions [ExtractSEOMetadata]
  args {
    img {
      url "https://github.com/images/modules/site/home-campaign/hero-bg.webp"
    }
  }
}