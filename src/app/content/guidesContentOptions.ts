import type { ContentProcessOptions } from "@adaptive-ds/website-content-pipeline"

/** English `Guides` collection. Sources stay outside `public/` (contentDir === publicContentDir). */
export const guidesContentOptions = {
  logLevel: 3,
  contentSection: "guides",
  contentDir: "./content/guides",
  publicBlogDir: "./content/guides",
  publicContentDir: "./content/guides",
  publicPathBase: "/en/guides",
  publicContentPathBase: "/en/guides",
  imagePromptsDir: "./src/app/content/image-prompts",
  contentListOutputPath: "./src/app/content/guidesContentList.ts",
  imageOriginalsDir: "./images",
  imageOptimizedDir: "./public/images",
  formatContentListWithBiome: true,
  optimizeImages: false,
  generateMissingImages: false,
  generateImagePrompts: false,
  runCodexImageGeneration: false,
} satisfies ContentProcessOptions
