import { assetsOptimize } from "@adaptive-ds/assets-optimizer"
import { eventorenImageOptimizeOptions } from "./eventorenImageOptimizeOptions.js"

await assetsOptimize({
  logLevel: 3,
  imageOriginalsDir: "./images",
  imageOptimizedDir: "./public/images",
  ...eventorenImageOptimizeOptions,
  videoOriginalsDir: "./videos",
  videoOptimizedDir: "./public/videos",
  videoListOutputPath: "./src/app/assets/videoList.ts",
  fontOriginalsDir: "./fonts",
  fontOptimizedDir: "./public/fonts",
  fontListOutputPath: "./src/app/assets/fontList.ts",
})
