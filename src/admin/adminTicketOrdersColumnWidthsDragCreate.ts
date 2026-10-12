type ColumnWidthsDragEvent = {
  readonly clientX: number
}

type ColumnWidthsDragTarget = {
  readonly addEventListener: (
    type: "pointermove" | "pointerup" | "pointercancel",
    listener: (event: ColumnWidthsDragEvent) => void,
  ) => void
  readonly removeEventListener: (
    type: "pointermove" | "pointerup" | "pointercancel",
    listener: (event: ColumnWidthsDragEvent) => void,
  ) => void
}

export function adminTicketOrdersColumnWidthsDragCreate(options: {
  readonly startX: number
  readonly onDelta: (deltaX: number) => void
  readonly onDone?: () => void
  readonly target?: ColumnWidthsDragTarget
}): { readonly cancel: () => void } | null {
  const target =
    options.target ?? (typeof window === "undefined" ? undefined : (window as unknown as ColumnWidthsDragTarget))
  if (!target) return null

  const onMove = (event: ColumnWidthsDragEvent) => {
    options.onDelta(event.clientX - options.startX)
  }
  const onEnd = () => {
    cancel()
    options.onDone?.()
  }
  const cancel = () => {
    target.removeEventListener("pointermove", onMove)
    target.removeEventListener("pointerup", onEnd)
    target.removeEventListener("pointercancel", onEnd)
  }

  target.addEventListener("pointermove", onMove)
  target.addEventListener("pointerup", onEnd)
  target.addEventListener("pointercancel", onEnd)
  return { cancel }
}
