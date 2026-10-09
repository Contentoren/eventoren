import type { AssetsOptimizeOptions } from "@adaptive-ds/assets-optimizer"

// Legacy optimization must not touch service-managed payment logos or overwrite
// the assets-service catalog at imageList.ts. Filtering also skips stale-output
// deletion, retaining existing payment and other service-managed public images.
// The five 1920x1080_webp JPG originals migrated to the dedicated bucket had
// their local copies removed through guarded `assets local-delete`; they stay
// readable only through the managed catalog (imageList i1920x1080_webp_* via
// urlImage). Keep imageFilterDirs non-empty so the stale-deletion pass stays
// skipped, keep generateImageList false so the catalog is never overwritten,
// and keep the matching bisync excludes in eventorenImageSourceBisync.ts so
// resync runs neither propagate remote deletions nor resurrect local copies.
export const eventorenImageOptimizeOptions = {
  ignoredDirNames: ["payment-methods"],
  imageFilterDirs: ["./images"],
  generateImageList: false,
} satisfies Pick<AssetsOptimizeOptions, "ignoredDirNames" | "imageFilterDirs" | "generateImageList">
