import type { ContentProcessOptions } from "@adaptive-ds/website-content-pipeline"

/** German `Ratgeber` collection. Sources stay outside `public/` (contentDir === publicContentDir). */
export const contentOptions = {
  logLevel: 3,
  contentSection: "ratgeber",
  contentDir: "./content/ratgeber",
  publicBlogDir: "./content/ratgeber",
  publicContentDir: "./content/ratgeber",
  publicPathBase: "/ratgeber",
  publicContentPathBase: "/ratgeber",
  imagePromptsDir: "./src/app/content/image-prompts",
  contentListOutputPath: "./src/app/content/contentList.ts",
  imageOriginalsDir: "./images",
  imageOptimizedDir: "./public/images",
  formatContentListWithBiome: true,
  optimizeImages: false,
  generateMissingImages: false,
  generateImagePrompts: false,
  runCodexImageGeneration: false,
} satisfies ContentProcessOptions
