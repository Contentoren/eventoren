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

  const args = [
    "bisync",
    localPath,
    remotePath,
    "--create-empty-src-dirs",
    "--resilient",
    "--recover",
    "--exclude",
    "/payment-methods/**",
  ]
  if (resync) args.push("--resync")

  await runRcloneFn(args, cwd)
  return true
}
