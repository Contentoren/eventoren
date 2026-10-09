import { runRclone, shouldBisync } from "@adaptive-ds/assets-optimizer"

export const eventorenImageSourceBisync = async ({
  cwd,
  localPath,
  remotePath,
  resync,
  runRcloneFn = runRclone,
  shouldBisyncFn = shouldBisync,
}: {
  cwd: string
  localPath: string
  remotePath: string
  resync: boolean
  runRcloneFn?: typeof runRclone
  shouldBisyncFn?: typeof shouldBisync
}) => {
  if (!(await shouldBisyncFn(localPath, remotePath))) return false

  // Service-managed originals whose local copies were removed through guarded
  // `assets local-delete` (canonical source key -> asset mapping preserved
  // here so future bisync runs neither propagate remote deletions nor resurrect
  // local copies):
  // - 1920x1080_webp/concert-crowd.jpg -> asset-upload-6c683a9a-8c0f-4663-bc55-d0d7a4a9799f
  // - 1920x1080_webp/dj-stage.jpg -> asset-upload-bcd3bbc9-30c8-4a0c-811f-7ac647dbef7d
  // - 1920x1080_webp/event-production.jpg -> asset-upload-2aab87d1-6c85-41c7-9a50-512f3c6c163f
  // - 1920x1080_webp/festival-lights.jpg -> asset-upload-bf3c7bbc-1dde-4271-b710-b4d0dbfa18c7
  // - 1920x1080_webp/stage-beams.jpg -> asset-upload-aa95045c-9f95-4abd-b528-dfc3055f2f54
  const migratedSourceExcludes = [
    "/1920x1080_webp/concert-crowd.jpg",
    "/1920x1080_webp/dj-stage.jpg",
    "/1920x1080_webp/event-production.jpg",
    "/1920x1080_webp/festival-lights.jpg",
    "/1920x1080_webp/stage-beams.jpg",
  ]
  const args = [
    "bisync",
    localPath,
    remotePath,
    "--create-empty-src-dirs",
    "--resilient",
    "--recover",
    "--exclude",
    "/payment-methods/**",
    ...migratedSourceExcludes.flatMap((exclude) => ["--exclude", exclude]),
  ]
  if (resync) args.push("--resync")

  await runRcloneFn(args, cwd)
  return true
}
