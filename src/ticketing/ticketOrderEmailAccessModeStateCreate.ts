import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { ticketOrderEmailAccessModeDetect } from "./ticketOrderEmailAccessModeDetect.ts"

export function ticketOrderEmailAccessModeStateCreate() {
  const isActive = createSignalObject(false)

  const initialize = (hash: string) => {
    isActive.set(ticketOrderEmailAccessModeDetect(hash))
  }

  return { isActive: isActive.get, initialize }
}
