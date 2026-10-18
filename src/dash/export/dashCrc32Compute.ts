export function dashCrc32Compute(data: Uint8Array): number {
  let table = dashCrc32Table
  if (table === null) {
    table = new Uint32Array(256)
    for (let code = 0; code < 256; code++) {
      let entry = code
      for (let round = 0; round < 8; round++) entry = entry % 2 === 0 ? entry >>> 1 : (entry >>> 1) ^ 0xedb88320
      table[code] = entry >>> 0
    }
    dashCrc32Table = table
  }
  let crc = 0xffffffff
  for (const byte of data) crc = ((crc >>> 8) ^ table[(crc ^ byte) & 0xff]!) >>> 0
  return (crc ^ 0xffffffff) >>> 0
}

let dashCrc32Table: Uint32Array | null = null
