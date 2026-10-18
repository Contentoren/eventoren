import { dashStoreGet } from "./dashStoreGet.ts"

export function dashStoreResetEmpty(): void {
  dashStoreGet().resetEmpty()
}
