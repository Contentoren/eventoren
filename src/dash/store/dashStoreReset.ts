import { dashStoreGet } from "./dashStoreGet.ts"

export function dashStoreReset(): void {
  dashStoreGet().reset()
}
