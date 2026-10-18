import { createSignal } from "solid-js"
import { copyFallback } from "#ui/interactive/copy/copyFallback.js"

export function copyButtonStateCreate(input: { value: () => string; copiedLabel: () => string }) {
  const [copied, setCopied] = createSignal(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  const copy = async () => {
    const value = input.value()
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      copyFallback(value)
    }
    setCopied(true)
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => setCopied(false), 1500)
  }

  return { copied, copiedLabel: input.copiedLabel, copy }
}
