import { processAssets } from "@adaptive-ds/assets-optimizer"
import { packageName } from "./package"

await processAssets({
  logLevel: 3,
  cwd: process.cwd(),
  resync: process.argv.includes("--resync"),
  sourceImagesRemotePath: `gdrive_beta:Bilder_und_Videos/${packageName}/Bilder`,
  processImages: true,
  imageOriginalsDir: "./images",
  imageOptimizedDir: "./public/images",
  imageListOutputPath: "./src/app/assets/imageList.ts",
  destImagesRemotePath: `cf_leo:${packageName}/images/optimized`,
  imageCacheControl: "Cache-Control:public, max-age=31536000, immutable",
  processVideos: true,
  sourceVideosRemotePath: `gdrive_beta:Bilder_und_Videos/${packageName}/Videos`,
  videoOriginalsDir: "./videos",
  videoOptimizedDir: "./public/videos",
  videoListOutputPath: "./src/app/assets/videoList.ts",
  destVideosRemotePath: `cf_leo:${packageName}/videos/optimized`,
  videoCacheControl: "Cache-Control:public, max-age=259200, immutable",
  processFonts: true,
  sourceFontsRemotePath: `gdrive_beta:Bilder_und_Videos/${packageName}/Fonts`,
  fontOriginalsDir: "./fonts",
  fontOptimizedDir: "./public/fonts",
  fontListOutputPath: "./src/app/assets/fontList.ts",
  destFontsRemotePath: `cf_leo:${packageName}/fonts/optimized`,
  fontCacheControl: "Cache-Control:public, max-age=31536000, immutable",
})
