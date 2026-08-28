import { createResult } from "../ui/createResult.ts"
import type { Result } from "../ui/Result.ts"
import { ticketQrMatrixCreate } from "./ticketQrMatrixCreate.ts"

const quietZone = 4

export function ticketQrSvgGenerate(text: string): Result<string> {
  const matrix = ticketQrMatrixCreate(text)
  if (!matrix.success) return matrix

  const size = matrix.data.length
  const total = size + quietZone * 2

  let path = ""
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!matrix.data[y]![x]) continue
      path += `M${x + quietZone} ${y + quietZone}h1v1h-1z`
    }
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">` +
    `<rect width="${total}" height="${total}" fill="#ffffff"/>` +
    `<path d="${path}" fill="#000000"/>` +
    "</svg>"

  return createResult(svg)
}
