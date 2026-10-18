type DashSeedEventLike = {
  id: string
  startsAt: string
  publishedAt: string | null
}

function spikeWeight(daysAgo: number, center: number, width: number, height: number): number {
  const distance = (daysAgo - center) / width
  return height * Math.exp(-distance * distance)
}

/**
 * Verkaufskurve: Gewicht für einen Verkaufszeitpunkt.
 * - `salesStartAgo` / `endAgo`: Tage vor `now` (Verkaufsstart / Verkaufsende).
 * - Spitzen bei Ankündigung, vor jedem Phasenende und in den letzten 7 Tagen.
 * - Vergangene Events stoppen am Start; Lesung/Entwurf ohne Verkäufe.
 */
export function dashSeedOrderTimes(random: () => number): {
  timesCreate: (args: {
    count: number
    salesStartAgo: number
    endAgo: number
    phaseEndAgos: number[]
    lastWeekBoost: number
  }) => number[]
} {
  return {
    timesCreate: ({ count, salesStartAgo, endAgo, phaseEndAgos, lastWeekBoost }) => {
      const span = Math.max(1, salesStartAgo - endAgo)
      const times: number[] = []
      for (let index = 0; index < count; index += 1) {
        const daysAgo = endAgo + random() * span
        let weight = 1 + spikeWeight(daysAgo, salesStartAgo - 2, 3, 2.5)
        for (const phaseAgo of phaseEndAgos) weight += spikeWeight(daysAgo, phaseAgo + 1, 2.5, 2)
        if (daysAgo < 7) weight += lastWeekBoost
        if (random() < weight / (weight + 4)) times.push(daysAgo)
        else times.push(endAgo + random() * span)
      }
      times.sort((a, b) => b - a)
      return times
    },
  }
}

export function dashSeedSalesWindow(event: DashSeedEventLike, now: Date): { start: number; end: number } {
  const startMs = Date.parse(event.publishedAt ?? event.startsAt)
  const endMs = Math.min(now.getTime(), Date.parse(event.startsAt))
  return { start: startMs, end: endMs }
}
