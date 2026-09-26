import { afterEach, expect, test } from "bun:test"
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { optimizeImages } from "@adaptive-ds/assets-optimizer"
import sharp from "sharp"
import { imageList } from "./imageList.js"
import { eventorenImageOptimizeOptions } from "./eventorenImageOptimizeOptions.js"
import { imageList as serviceImageList } from "./service/imageList.js"

const temporaryDirs: string[] = []

afterEach(async () => {
  for (const dir of temporaryDirs.splice(0)) await rm(dir, { recursive: true, force: true })
})

test("Legacy image processing leaves payment sources, existing outputs and the service catalog alone", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "eventoren-image-processor-"))
  temporaryDirs.push(cwd)
  const sources = join(cwd, "images", "2x2_png")
  const payments = join(cwd, "images", "payment-methods", "2x2_png")
  const outputs = join(cwd, "public", "images")
  const catalog = join(cwd, "imageList.ts")
  await Promise.all([
    mkdir(sources, { recursive: true }),
    mkdir(payments, { recursive: true }),
    mkdir(join(outputs, "payment-methods"), { recursive: true }),
  ])
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } })
    .png()
    .toBuffer()
  await Promise.all([
    writeFile(join(sources, "unmanaged.png"), png),
    writeFile(join(payments, "visa.png"), png),
    writeFile(join(outputs, "payment-methods", "visa.png"), png),
    writeFile(join(outputs, "service-only.avif"), "preserved"),
    writeFile(catalog, "service-generated payment_methods_visa entry"),
  ])

  const result = await optimizeImages({
    cwd,
    imageOriginalsDir: "./images",
    imageOptimizedDir: "./public/images",
    imageListOutputPath: catalog,
    ...eventorenImageOptimizeOptions,
  })

  expect(result.processed).toHaveLength(1)
  expect(result.processed[0]).toMatch(/^unmanaged_[0-9a-f]{8}\.png$/)
  expect(result.deletedLocal).toEqual([])
  expect(await readdir(join(outputs, "payment-methods"))).toEqual(["visa.png"])
  expect(await readFile(join(outputs, "service-only.avif"), "utf8")).toBe("preserved")
  expect(await readFile(catalog, "utf8")).toBe("service-generated payment_methods_visa entry")
  const paymentKeys = Object.keys(imageList).filter((key) => key.startsWith("payment_methods_"))
  expect(paymentKeys).toHaveLength(8)
  expect(paymentKeys.map((key) => imageList[key as keyof typeof imageList].path)).toEqual(
    paymentKeys.map((key) => serviceImageList[key as keyof typeof serviceImageList].path),
  )
})
