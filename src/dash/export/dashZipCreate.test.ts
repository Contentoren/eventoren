import { expect, test } from "bun:test"
import { dashCrc32Compute } from "./dashCrc32Compute.ts"
import { dashZipCreate } from "./dashZipCreate.ts"

test("CRC32 von '123456789' ist 0xCBF43926", () => {
  expect(dashCrc32Compute(new TextEncoder().encode("123456789"))).toBe(0xcbf43926)
})

test("CRC32 der leeren Eingabe ist 0", () => {
  expect(dashCrc32Compute(new Uint8Array(0))).toBe(0)
})

type DashZipEntry = {
  readonly name: string
  readonly crc: number
  readonly compressedSize: number
  readonly uncompressedSize: number
  readonly method: number
  readonly utf8: boolean
  readonly data: Uint8Array
}

function dashZipEntriesParse(zip: Uint8Array): DashZipEntry[] {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength)
  const eocd = zip.length - 22
  expect(view.getUint32(eocd, true)).toBe(0x06054b50)
  const count = view.getUint16(eocd + 8, true)
  const centralOffset = view.getUint32(eocd + 16, true)
  const entries: DashZipEntry[] = []
  let offset = centralOffset
  for (let index = 0; index < count; index++) {
    expect(view.getUint32(offset, true)).toBe(0x02014b50)
    const flags = view.getUint16(offset + 8, true)
    const method = view.getUint16(offset + 10, true)
    const crc = view.getUint32(offset + 16, true)
    const compressedSize = view.getUint32(offset + 20, true)
    const uncompressedSize = view.getUint32(offset + 24, true)
    const nameLength = view.getUint16(offset + 28, true)
    const headerOffset = view.getUint32(offset + 42, true)
    const nameBytes = zip.slice(offset + 46, offset + 46 + nameLength)
    const name = new TextDecoder().decode(nameBytes)
    expect(view.getUint32(headerOffset, true)).toBe(0x04034b50)
    expect(view.getUint16(headerOffset + 8, true)).toBe(0)
    const localNameLength = view.getUint16(headerOffset + 26, true)
    const dataStart = headerOffset + 30 + localNameLength
    entries.push({
      name,
      crc,
      compressedSize,
      uncompressedSize,
      method,
      utf8: (flags & 0x0800) !== 0,
      data: zip.slice(dataStart, dataStart + compressedSize),
    })
    offset += 46 + nameLength
  }
  return entries
}

test("legt Dateien unkomprimiert mit UTF-8-Flag und Central Directory ab", () => {
  const first = new TextEncoder().encode("Hallo Welt")
  const second = new TextEncoder().encode("Grüße: äöü")
  const zip = dashZipCreate([
    { path: "teilnehmer.csv", data: first },
    { path: "ordner/Übersicht.txt", data: second },
  ])
  const entries = dashZipEntriesParse(zip)
  expect(entries.map((entry) => entry.name)).toEqual(["teilnehmer.csv", "ordner/Übersicht.txt"])
  for (const entry of entries) {
    expect(entry.method).toBe(0)
    expect(entry.utf8).toBe(true)
    expect(entry.compressedSize).toBe(entry.uncompressedSize)
    expect(entry.crc).toBe(dashCrc32Compute(entry.data))
  }
  expect(new TextDecoder().decode(entries[0]!.data)).toBe("Hallo Welt")
  expect(new TextDecoder().decode(entries[1]!.data)).toBe("Grüße: äöü")
})
