import { createMemo } from "solid-js"
import { ticketQrSvgGenerate } from "./ticketQrSvgGenerate.ts"

export function ticketQrCodeStateCreate(inputs: { value: () => string }) {
  const generated = createMemo(() => ticketQrSvgGenerate(inputs.value()))

  const svgMarkup = createMemo(() => {
    const result = generated()
    return result.success ? result.data : ""
  })

  const errorMessage = createMemo(() => {
    const result = generated()
    return result.success ? "" : result.errorMessage
  })

  return { svgMarkup, errorMessage }
}
