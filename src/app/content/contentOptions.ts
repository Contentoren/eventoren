import type { ContentProcessOptions } from "@adaptive-ds/website-content-pipeline"

export const contentOptions = {
  logLevel: 3,
  contentSection: "ratgeber",
  contentDir: "./public/ratgeber",
  publicBlogDir: "./public/ratgeber",
  publicContentDir: "./public/ratgeber",
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
