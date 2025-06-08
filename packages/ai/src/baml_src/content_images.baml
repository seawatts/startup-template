// Webpage images assessment analysis
class WebpageImagesReport {
  total_images int @description("Total number of images detected on the page.")
  images_info ImageInfo[] @description("List of information for each image, including alt text, descriptive quality, and whether it is decorative.")
  missing_alt_count int @description("Number of images missing alt text.")
  non_descriptive_alt_count int @description("Number of images with non-descriptive alt text.")
  decorative_images int @description("Number of images identified as decorative.")
  recommendation string @description("Recommendation for improving image accessibility and SEO, including writing descriptive alt text and marking decorative images appropriately.")
  summary string @description("Summary of image accessibility and SEO issues found.")
}

class ImageInfo {
  src string @description("Source or identifier of the image.")
  alt_text string? @description("Alt text of the image, if present.")
  descriptive bool @description("True if the alt text is descriptive and meaningful.")
  decorative bool @description("True if the image is decorative and does not convey meaningful content.")
}

function AssessWebpageImages(img: image) -> WebpageImagesReport {
  client "openai/gpt-4o"
  prompt #"
    {{_.role("user")}}
    Analyze this website screenshot image: {{ img }}
    For each image detected on the page, extract its source or identifier, alt text (if present), and determine if the alt text is descriptive and if the image is decorative.
    Count the total number of images, those missing alt text, those with non-descriptive alt text, and those that are decorative.
    Provide a recommendation for improving image accessibility and SEO, including writing descriptive alt text and marking decorative images appropriately.
    Provide a summary of the main image accessibility and SEO issues found.
    {{ ctx.output_format }}
  "#
}

test assess_webpage_images_github {
  functions [AssessWebpageImages]
  args {
    img {
      url "https://github.com/images/modules/site/home-campaign/hero-bg.webp"
    }
  }
}