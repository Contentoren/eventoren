type IdleScheduler = (callback: () => void) => void

const scheduleIdle: IdleScheduler = (callback) => {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => callback())
    return
  }
  setTimeout(callback, 0)
}

export function ticketStorageIdleWrite(write: () => void, delayMs = 400): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined

  return () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = setTimeout(() => scheduleIdle(write), delayMs)
  }
}
