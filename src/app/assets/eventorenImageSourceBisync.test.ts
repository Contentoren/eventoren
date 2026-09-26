import { afterEach, expect, test } from "bun:test"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { eventorenImageSourceBisync } from "./eventorenImageSourceBisync.js"

const temporaryDirs: string[] = []

afterEach(async () => {
  for (const dir of temporaryDirs.splice(0)) await rm(dir, { recursive: true, force: true })
})

test("Image source bisync excludes payment-methods while restoring other originals", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "eventoren-image-bisync-"))
  temporaryDirs.push(cwd)
  const remote = join(cwd, "remote")
  const local = join(cwd, "images")
  await Promise.all([
    mkdir(join(remote, "payment-methods"), { recursive: true }),
    mkdir(join(remote, "campaign"), { recursive: true }),
  ])
  await Promise.all([
    writeFile(join(remote, "payment-methods", "visa.png"), "managed payment source"),
    writeFile(join(remote, "campaign", "banner.png"), "legacy source"),
  ])

  await eventorenImageSourceBisync({
    cwd,
    localPath: "./images",
    remotePath: "remote",
    resync: true,
    shouldBisyncFn: async () => true,
    runRcloneFn: async (args) => {
      expect(args).toContain("--exclude")
      expect(args).toContain("/payment-methods/**")
      expect(args).toContain("--resync")
      await mkdir(join(local, "campaign"), { recursive: true })
      await writeFile(join(local, "campaign", "banner.png"), await readFile(join(remote, "campaign", "banner.png")))
      if (!args.includes("/payment-methods/**")) {
        await mkdir(join(local, "payment-methods"), { recursive: true })
        await writeFile(
          join(local, "payment-methods", "visa.png"),
          await readFile(join(remote, "payment-methods", "visa.png")),
        )
      }
    },
  })

  expect(await readFile(join(local, "campaign", "banner.png"), "utf8")).toBe("legacy source")
  await expect(readFile(join(local, "payment-methods", "visa.png"))).rejects.toMatchObject({ code: "ENOENT" })
})
