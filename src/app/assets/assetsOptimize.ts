import { assetsOptimize } from "@adaptive-ds/assets-optimizer"

await assetsOptimize({
  logLevel: 3,
  imageOriginalsDir: "./images",
  imageOptimizedDir: "./public/images",
  imageListOutputPath: "./src/app/assets/imageList.ts",
  videoOriginalsDir: "./videos",
  videoOptimizedDir: "./public/videos",
  videoListOutputPath: "./src/app/assets/videoList.ts",
  fontOriginalsDir: "./fonts",
  fontOptimizedDir: "./public/fonts",
  fontListOutputPath: "./src/app/assets/fontList.ts",
})
