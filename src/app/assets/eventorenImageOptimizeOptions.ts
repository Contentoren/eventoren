import type { AssetsOptimizeOptions } from "@adaptive-ds/assets-optimizer"

// Legacy optimization must not touch service-managed payment logos or overwrite
// the assets-service catalog at imageList.ts. Filtering also skips stale-output
// deletion, retaining existing payment and other service-managed public images.
export const eventorenImageOptimizeOptions = {
  ignoredDirNames: ["payment-methods"],
  imageFilterDirs: ["./images"],
  generateImageList: false,
} satisfies Pick<AssetsOptimizeOptions, "ignoredDirNames" | "imageFilterDirs" | "generateImageList">
