import { assetsOptimize, processAssets, runRclone } from "@adaptive-ds/assets-optimizer"
import { eventorenImageOptimizeOptions } from "./eventorenImageOptimizeOptions.js"
import { eventorenImageSourceBisync } from "./eventorenImageSourceBisync.js"
import { packageName } from "./package.js"

const cwd = process.cwd()
const resync = process.argv.includes("--resync")
const sourceImagesRemotePath = `gdrive_beta:Bilder_und_Videos/${packageName}/Bilder`
const imageOptimizedDir = "./public/images"
const destImagesRemotePath = `cf_leo:${packageName}/images/optimized`

const syncImages = await eventorenImageSourceBisync({
  cwd,
  localPath: "./images",
  remotePath: sourceImagesRemotePath,
  resync,
})

await processAssets({
  logLevel: 3,
  cwd,
  resync,
  sourceImagesRemotePath,
  destImagesRemotePath,
  processImages: false,
  imageOriginalsDir: "./images",
  ...eventorenImageOptimizeOptions,
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

if (syncImages) {
  await assetsOptimize({
    logLevel: 3,
    cwd,
    processImages: true,
    processVideos: false,
    processFonts: false,
    imageOriginalsDir: "./images",
    imageOptimizedDir,
    ...eventorenImageOptimizeOptions,
  })

  await runRclone(
    [
      "sync",
      imageOptimizedDir,
      destImagesRemotePath,
      "--header-upload",
      "Cache-Control:public, max-age=31536000, immutable",
    ],
    cwd,
  )
}
