import { type Accessor, batch, createEffect, createMemo, createSignal, onCleanup, type Setter } from "solid-js"

const tickerItems = [
  "Konzerte & Tourneen",
  "Open-Air-Festivals",
  "Kultur & Theater",
  "Stadion- & Sportevents",
  "VIP & Backstage Access",
  "Mobile Wallet-Tickets",
  "Exklusive Presales",
  "Aftershow-Partys",
] as const

const tickerSetCount = 5
const tickerRenderItems = Array.from({ length: tickerSetCount }, () => tickerItems).flat()

const partnerLogos = ["Coca-Cola", "Ogilvy", "R/GA", "Wonder", "GUESS", "Delivery Hero"] as const

const tickerItemHeightPx = 60
const tickerCenterOffsetPx = 180
const tickerTransitionDurationMs = 700
const tickerOpacityMap = [1, 0.45, 0.3, 0.2, 0.1] as const
const tickerIntervalMs = 2500
const tickerStartIndex = tickerItems.length * 2
const tickerResetThreshold = tickerItems.length * 3

type SignalObject<T> = {
  get: Accessor<T>
  set: Setter<T>
}

const createSignalObject = <T>(initialValue: T): SignalObject<T> => {
  const [get, set] = createSignal(initialValue)
  return { get, set }
}

export function eventHeroMagnificStateCreate(inputs: { eventCount: () => number }) {
  const virtualIndex = createSignalObject(tickerStartIndex)
  const isTransitioning = createSignalObject(false)
  const eventCount = createMemo(() => inputs.eventCount())

  const tickerOffset = createMemo(() => `${tickerCenterOffsetPx - virtualIndex.get() * tickerItemHeightPx}px`)
  const tickerItemOpacity = (index: number) => {
    const distance = Math.abs(index - virtualIndex.get())
    return tickerOpacityMap[Math.min(distance, tickerOpacityMap.length - 1)] ?? 0.1
  }

  createEffect(() => {
    if (typeof window === "undefined") return

    let resetTimer: number | undefined
    let reenableTransitionFrame: number | undefined

    const timer = window.setInterval(() => {
      const nextIndex = virtualIndex.get() + 1
      isTransitioning.set(true)
      virtualIndex.set(nextIndex)

      if (nextIndex !== tickerResetThreshold) return

      resetTimer = window.setTimeout(() => {
        batch(() => {
          isTransitioning.set(false)
          virtualIndex.set(nextIndex - tickerItems.length)
        })
        reenableTransitionFrame = window.requestAnimationFrame(() => {
          reenableTransitionFrame = window.requestAnimationFrame(() => {
            isTransitioning.set(true)
            reenableTransitionFrame = undefined
          })
        })
        resetTimer = undefined
      }, tickerTransitionDurationMs + 400)
    }, tickerIntervalMs)

    onCleanup(() => {
      window.clearInterval(timer)
      if (resetTimer !== undefined) window.clearTimeout(resetTimer)
      if (reenableTransitionFrame !== undefined) window.cancelAnimationFrame(reenableTransitionFrame)
    })
  })

  return {
    virtualIndex: virtualIndex.get,
    activeVirtualIndex: virtualIndex.get,
    isTransitioning: isTransitioning.get,
    isTransitionEnabled: isTransitioning.get,
    tickerItems: () => tickerRenderItems,
    tickerOffset,
    tickerItemOpacity,
    partnerLogos: () => partnerLogos,
    eventCount,
  }
}
