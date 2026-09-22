import { useContext } from "solid-js"
import { eventorenAuthContext } from "./eventorenAuthContext.ts"

export function eventorenAuthContextUse() {
  return useContext(eventorenAuthContext)
}
