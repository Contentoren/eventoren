import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"

const op = "ticketQrMatrixCreate"

// Minimal QR Code encoder: byte mode, error correction level M, versions 1..10.
// Fully offline, no external dependency.

const eccCodewordsPerBlock = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26] as const
const eccBlockCount = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5] as const
const maxVersion = 10

function rawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64
  if (version >= 2) {
    const alignCount = Math.floor(version / 7) + 2
    result -= (25 * alignCount - 10) * alignCount - 55
    if (version >= 7) result -= 36
  }
  return result
}

function totalCodewords(version: number): number {
  return Math.floor(rawDataModules(version) / 8)
}

function dataCodewords(version: number): number {
  return totalCodewords(version) - eccCodewordsPerBlock[version]! * eccBlockCount[version]!
}

function alignmentPositions(version: number): number[] {
  if (version === 1) return []
  const count = Math.floor(version / 7) + 2
  const step = Math.floor((version * 8 + count * 3 + 5) / (count * 4 - 4)) * 2
  const positions = [6]
  for (let pos = version * 4 + 10; positions.length < count; pos -= step) positions.splice(1, 0, pos)
  return positions
}

function galoisMultiply(a: number, b: number): number {
  let result = 0
  for (let i = 7; i >= 0; i--) {
    result = (result << 1) ^ ((result >>> 7) * 0x11d)
    result ^= ((b >>> i) & 1) * a
  }
  return result & 0xff
}

function reedSolomonDivisor(degree: number): number[] {
  const divisor = new Array<number>(degree).fill(0)
  divisor[degree - 1] = 1
  let root = 1
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      divisor[j] = galoisMultiply(divisor[j]!, root) ^ (divisor[j + 1] ?? 0)
    }
    root = galoisMultiply(root, 0x02)
  }
  return divisor
}

function reedSolomonRemainder(data: readonly number[], divisor: readonly number[]): number[] {
  const result = new Array<number>(divisor.length).fill(0)
  for (const byte of data) {
    const factor = byte ^ result.shift()!
    result.push(0)
    for (let i = 0; i < divisor.length; i++) result[i] = result[i]! ^ galoisMultiply(divisor[i]!, factor)
  }
  return result
}

function bytesEncode(text: string): number[] {
  return Array.from(new TextEncoder().encode(text))
}

function codewordsCreate(version: number, bytes: readonly number[]): number[] {
  const bits: number[] = []
  const appendBits = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1)
  }

  appendBits(0b0100, 4)
  appendBits(bytes.length, version < 10 ? 8 : 16)
  for (const byte of bytes) appendBits(byte, 8)

  const capacityBits = dataCodewords(version) * 8
  appendBits(0, Math.min(4, capacityBits - bits.length))
  appendBits(0, (8 - (bits.length % 8)) % 8)
  for (let pad = 0xec; bits.length < capacityBits; pad ^= 0xec ^ 0x11) appendBits(pad, 8)

  const data: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j]!
    data.push(byte)
  }

  const blockCount = eccBlockCount[version]!
  const eccLength = eccCodewordsPerBlock[version]!
  const shortBlockLength = Math.floor(dataCodewords(version) / blockCount)
  const shortBlockCount = blockCount - (dataCodewords(version) % blockCount)
  const divisor = reedSolomonDivisor(eccLength)

  const dataBlocks: number[][] = []
  const eccBlocks: number[][] = []
  let offset = 0
  for (let i = 0; i < blockCount; i++) {
    const length = shortBlockLength + (i < shortBlockCount ? 0 : 1)
    const block = data.slice(offset, offset + length)
    offset += length
    dataBlocks.push(block)
    eccBlocks.push(reedSolomonRemainder(block, divisor))
  }

  const result: number[] = []
  for (let i = 0; i < shortBlockLength + 1; i++) {
    for (let b = 0; b < blockCount; b++) {
      const value = dataBlocks[b]![i]
      if (value !== undefined) result.push(value)
    }
  }
  for (let i = 0; i < eccLength; i++) {
    for (let b = 0; b < blockCount; b++) result.push(eccBlocks[b]![i]!)
  }
  return result
}

function bchFormatBits(data: number): number {
  let rem = data
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
  return ((data << 10) | rem) ^ 0x5412
}

function bchVersionBits(version: number): number {
  let rem = version
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25)
  return (version << 12) | rem
}

function maskApplies(mask: number, x: number, y: number): boolean {
  if (mask === 0) return (x + y) % 2 === 0
  if (mask === 1) return y % 2 === 0
  if (mask === 2) return x % 3 === 0
  if (mask === 3) return (x + y) % 3 === 0
  if (mask === 4) return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0
  if (mask === 5) return ((x * y) % 2) + ((x * y) % 3) === 0
  if (mask === 6) return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0
  return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0
}

function penaltyScore(modules: boolean[][], size: number): number {
  let score = 0
  const lineScore = (line: boolean[]) => {
    let runLength = 1
    for (let i = 1; i < line.length; i++) {
      if (line[i] === line[i - 1]) {
        runLength++
        if (runLength === 5) score += 3
        else if (runLength > 5) score += 1
        continue
      }
      runLength = 1
    }
  }
  for (let y = 0; y < size; y++) lineScore(modules[y]!)
  for (let x = 0; x < size; x++) lineScore(modules.map((row) => row[x]!))

  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const value = modules[y]![x]
      if (value === modules[y]![x + 1] && value === modules[y + 1]![x] && value === modules[y + 1]![x + 1]) score += 3
    }
  }

  let dark = 0
  for (const row of modules) for (const cell of row) if (cell) dark++
  const ratio = Math.abs(dark * 20 - size * size * 10) / (size * size)
  score += Math.floor(ratio) * 10
  return score
}

export function ticketQrMatrixCreate(text: string): Result<boolean[][]> {
  if (text.length === 0) return createResultError(op, "QR-Inhalt darf nicht leer sein.", text)

  const bytes = bytesEncode(text)
  let version = 0
  for (let candidate = 1; candidate <= maxVersion; candidate++) {
    const headerBits = 4 + (candidate < 10 ? 8 : 16)
    if (headerBits + bytes.length * 8 <= dataCodewords(candidate) * 8) {
      version = candidate
      break
    }
  }
  if (version === 0) return createResultError(op, "QR-Inhalt ist zu lang.", text)

  const size = version * 4 + 17
  const modules: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  const reserved: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))

  const set = (x: number, y: number, dark: boolean, isFunction: boolean) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return
    modules[y]![x] = dark
    if (isFunction) reserved[y]![x] = true
  }

  const drawFinder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy))
        set(cx + dx, cy + dy, distance !== 2 && distance !== 4, true)
      }
    }
  }

  drawFinder(3, 3)
  drawFinder(size - 4, 3)
  drawFinder(3, size - 4)

  for (let i = 8; i < size - 8; i++) {
    const dark = i % 2 === 0
    set(i, 6, dark, true)
    set(6, i, dark, true)
  }

  const positions = alignmentPositions(version)
  for (const cy of positions) {
    for (const cx of positions) {
      const isFinderCorner = (cx === 6 && cy === 6) || (cx === 6 && cy === size - 7) || (cx === size - 7 && cy === 6)
      if (isFinderCorner) continue
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1, true)
        }
      }
    }
  }

  set(8, size - 8, true, true)

  const reserveFormat = () => {
    for (let i = 0; i <= 8; i++) {
      if (i !== 6) set(i, 8, false, true)
      if (i !== 6) set(8, i, false, true)
    }
    for (let i = 0; i < 8; i++) {
      set(size - 1 - i, 8, false, true)
      set(8, size - 1 - i, false, true)
    }
  }
  reserveFormat()

  if (version >= 7) {
    const bits = bchVersionBits(version)
    for (let i = 0; i < 18; i++) {
      const dark = ((bits >>> i) & 1) !== 0
      const a = size - 11 + (i % 3)
      const b = Math.floor(i / 3)
      set(a, b, dark, true)
      set(b, a, dark, true)
    }
  }

  const codewords = codewordsCreate(version, bytes)
  let bitIndex = 0
  for (let right = size - 1; right >= 1; right -= 2) {
    const column = right <= 6 ? right - 1 : right
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = column - j
        const upward = ((right + 1) & 2) === 0
        const y = upward ? size - 1 - vert : vert
        if (reserved[y]![x]) continue
        const byte = codewords[bitIndex >>> 3]
        modules[y]![x] = byte !== undefined && ((byte >>> (7 - (bitIndex & 7))) & 1) !== 0
        bitIndex++
      }
    }
  }

  const drawFormat = (mask: number) => {
    const bits = bchFormatBits((0b00 << 3) | mask)
    for (let i = 0; i <= 5; i++) modules[i]![8] = ((bits >>> i) & 1) !== 0
    modules[7]![8] = ((bits >>> 6) & 1) !== 0
    modules[8]![8] = ((bits >>> 7) & 1) !== 0
    modules[8]![7] = ((bits >>> 8) & 1) !== 0
    for (let i = 9; i < 15; i++) modules[8]![14 - i] = ((bits >>> i) & 1) !== 0
    for (let i = 0; i < 8; i++) modules[8]![size - 1 - i] = ((bits >>> i) & 1) !== 0
    for (let i = 8; i < 15; i++) modules[size - 15 + i]![8] = ((bits >>> i) & 1) !== 0
    modules[size - 8]![8] = true
  }

  const applyMask = (mask: number) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (reserved[y]![x]) continue
        if (maskApplies(mask, x, y)) modules[y]![x] = !modules[y]![x]
      }
    }
  }

  let bestMask = 0
  let bestScore = Number.POSITIVE_INFINITY
  for (let mask = 0; mask < 8; mask++) {
    applyMask(mask)
    drawFormat(mask)
    const score = penaltyScore(modules, size)
    if (score < bestScore) {
      bestScore = score
      bestMask = mask
    }
    applyMask(mask)
  }
  applyMask(bestMask)
  drawFormat(bestMask)

  return createResult(modules)
}
