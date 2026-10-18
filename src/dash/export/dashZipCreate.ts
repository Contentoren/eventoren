import { dashCrc32Compute } from "./dashCrc32Compute.ts"

export type DashZipFile = {
  readonly path: string
  readonly data: Uint8Array
}

function dashZipDateTimeDosSet(view: DataView, offset: number): void {
  // Fixed timestamp 2026-01-01 00:00:00 UTC, so builds are reproducible.
  view.setUint16(offset, (0 << 11) | (0 << 5) | 0, true)
  view.setUint16(offset + 2, ((2026 - 1980) << 9) | (1 << 5) | 1, true)
}

export function dashZipCreate(files: DashZipFile[]): Uint8Array {
  const encoder = new TextEncoder()
  const names = files.map((file) => encoder.encode(file.path))
  const headerSize = names.reduce((sum, name) => sum + 30 + name.length, 0)
  const centralSize = names.reduce((sum, name) => sum + 46 + name.length, 0)
  const totalSize = headerSize + files.reduce((sum, file) => sum + file.data.length, 0) + centralSize + 22
  const out = new Uint8Array(totalSize)
  const view = new DataView(out.buffer)
  let offset = 0
  const entries: { name: Uint8Array; crc: number; size: number; headerOffset: number }[] = []
  for (const [index, file] of files.entries()) {
    const name = names[index]!
    const crc = dashCrc32Compute(file.data)
    entries.push({ name, crc, size: file.data.length, headerOffset: offset })
    view.setUint32(offset, 0x04034b50, true)
    view.setUint16(offset + 4, 20, true)
    view.setUint16(offset + 6, 0x0800, true)
    view.setUint16(offset + 8, 0, true)
    dashZipDateTimeDosSet(view, offset + 10)
    view.setUint32(offset + 14, crc, true)
    view.setUint32(offset + 18, file.data.length, true)
    view.setUint32(offset + 22, file.data.length, true)
    view.setUint16(offset + 26, name.length, true)
    view.setUint16(offset + 28, 0, true)
    offset += 30
    out.set(name, offset)
    offset += name.length
    out.set(file.data, offset)
    offset += file.data.length
  }
  const centralOffset = offset
  for (const entry of entries) {
    view.setUint32(offset, 0x02014b50, true)
    view.setUint16(offset + 4, 20, true)
    view.setUint16(offset + 6, 20, true)
    view.setUint16(offset + 8, 0x0800, true)
    view.setUint16(offset + 10, 0, true)
    dashZipDateTimeDosSet(view, offset + 12)
    view.setUint32(offset + 16, entry.crc, true)
    view.setUint32(offset + 20, entry.size, true)
    view.setUint32(offset + 24, entry.size, true)
    view.setUint16(offset + 28, entry.name.length, true)
    view.setUint16(offset + 30, 0, true)
    view.setUint16(offset + 32, 0, true)
    view.setUint16(offset + 34, 0, true)
    view.setUint16(offset + 36, 0, true)
    view.setUint32(offset + 38, 0, true)
    view.setUint32(offset + 42, entry.headerOffset, true)
    offset += 46
    out.set(entry.name, offset)
    offset += entry.name.length
  }
  const centralLength = offset - centralOffset
  view.setUint32(offset, 0x06054b50, true)
  view.setUint16(offset + 4, 0, true)
  view.setUint16(offset + 6, 0, true)
  view.setUint16(offset + 8, entries.length, true)
  view.setUint16(offset + 10, entries.length, true)
  view.setUint32(offset + 12, centralLength, true)
  view.setUint32(offset + 16, centralOffset, true)
  view.setUint16(offset + 20, 0, true)
  return out
}
