import { execFile as execFileCallback } from "node:child_process"
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { promisify } from "node:util"
import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from "@zxing/library"

const execFile = promisify(execFileCallback)

export async function ticketE2ePdfInspect(pdf: Uint8Array): Promise<{
  text: string
  pages: { page: number; text: string; qrPayload?: string }[]
  decodedQrPayloads: string[]
}> {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-pdf-"))
  const pdfPath = join(directory, "ticket.pdf")
  const pagePrefix = join(directory, "page")

  try {
    await writeFile(pdfPath, pdf)
    const [textResult] = await Promise.all([
      execFile("pdftotext", ["-layout", pdfPath, "-"], { timeout: 20_000, maxBuffer: 4_000_000 }),
      execFile("pdftoppm", ["-r", "220", pdfPath, pagePrefix], { timeout: 60_000, maxBuffer: 1_000_000 }),
    ])
    const pageFiles = (await readdir(directory))
      .filter((file) => /^page-\d+\.ppm$/u.test(file))
      .sort((left, right) => Number(left.match(/-(\d+)\.ppm$/u)?.[1]) - Number(right.match(/-(\d+)\.ppm$/u)?.[1]))
    if (!pageFiles.length) throw new Error("Ticket PDF rasterization produced no pages")
    const textPages = textResult.stdout.split("\f")
    const pages = await Promise.all(
      pageFiles.map(async (filename, index) => {
        const raster = ppmRgbParse(await readFile(join(directory, filename)))
        const qrPayload = ticketE2ePdfQrDecode(raster)
        return { page: index + 1, text: textPages[index]?.trim() ?? "", qrPayload }
      }),
    )
    return {
      text: textPages
        .map((page) => page.trim())
        .filter(Boolean)
        .join("\n\n"),
      pages,
      decodedQrPayloads: [...new Set(pages.flatMap((page) => (page.qrPayload ? [page.qrPayload] : [])))],
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

function ticketE2ePdfQrDecode(raster: { width: number; height: number; rgb: Int32Array }): string | undefined {
  const reader = new MultiFormatReader()
  const source = new RGBLuminanceSource(raster.rgb, raster.width, raster.height)
  // The delivered A4 ticket has a 58mm QR in the upper-right column. Isolate it
  // from the text/table: ZXing's finder detector can mis-sample this crisp vector
  // QR (FormatException), while PURE_BARCODE reads the actual rasterized modules.
  const qrSize = Math.floor(raster.width * 0.29)
  const ticketQr = source.crop(Math.floor(raster.width * 0.64), Math.floor(raster.height * 0.06), qrSize, qrSize)
  const pureHints = new Map<DecodeHintType, unknown>([
    [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]],
    [DecodeHintType.TRY_HARDER, true],
    [DecodeHintType.PURE_BARCODE, true],
  ])
  const searchHints = new Map<DecodeHintType, unknown>([
    [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]],
    [DecodeHintType.TRY_HARDER, true],
  ])
  try {
    return reader.decode(new BinaryBitmap(new HybridBinarizer(ticketQr)), pureHints).getText()
  } catch {
    // Other PDFs can place the QR elsewhere; keep searching the raster.
  }
  const cropWidth = Math.ceil(raster.width * 0.6)
  const cropHeight = Math.ceil(raster.height * 0.6)
  const regions = [
    source,
    source.crop(0, 0, cropWidth, cropHeight),
    source.crop(raster.width - cropWidth, 0, cropWidth, cropHeight),
    source.crop(0, raster.height - cropHeight, cropWidth, cropHeight),
    source.crop(raster.width - cropWidth, raster.height - cropHeight, cropWidth, cropHeight),
    source.crop(
      Math.floor((raster.width - cropWidth) / 2),
      Math.floor((raster.height - cropHeight) / 2),
      cropWidth,
      cropHeight,
    ),
  ]
  for (const region of regions) {
    try {
      return reader.decode(new BinaryBitmap(new HybridBinarizer(region)), searchHints).getText()
    } catch {
      // A page or region may have no QR; try the remaining raster regions.
    }
  }
  return undefined
}

function ppmRgbParse(bytes: Buffer): { width: number; height: number; rgb: Int32Array } {
  let offset = 0
  const tokens: string[] = []
  while (tokens.length < 4) {
    while (bytes[offset] === 0x20 || bytes[offset] === 0x0a || bytes[offset] === 0x0d || bytes[offset] === 0x09)
      offset += 1
    if (bytes[offset] === 0x23) {
      while (bytes[offset] !== 0x0a && offset < bytes.length) offset += 1
      continue
    }
    const start = offset
    while (bytes[offset] !== 0x20 && bytes[offset] !== 0x0a && bytes[offset] !== 0x0d && bytes[offset] !== 0x09)
      offset += 1
    tokens.push(bytes.subarray(start, offset).toString("ascii"))
  }
  if (tokens[0] !== "P6" || Number(tokens[3]) !== 255) throw new Error("Unsupported PDF raster output")
  if (bytes[offset] === 0x0d && bytes[offset + 1] === 0x0a) offset += 2
  else offset += 1
  const width = Number(tokens[1])
  const height = Number(tokens[2])
  const channels = bytes.subarray(offset, offset + width * height * 3)
  if (!width || !height || channels.length !== width * height * 3) throw new Error("Invalid PDF raster output")
  const argb = new Int32Array(width * height)
  for (let pixel = 0; pixel < argb.length; pixel += 1) {
    const red = channels[pixel * 3] ?? 0
    const green = channels[pixel * 3 + 1] ?? 0
    const blue = channels[pixel * 3 + 2] ?? 0
    argb[pixel] = (0xff << 24) | (red << 16) | (green << 8) | blue
  }
  return { width, height, rgb: argb }
}
