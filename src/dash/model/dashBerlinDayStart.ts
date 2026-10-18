const berlinDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" })

const hourMs = 3_600_000

// Berlin (CET/CEST) liegt immer ganze Stunden vor UTC: Mitternacht in Berlin
// ist 23:00 UTC (CET) bzw. 22:00 UTC (CEST) des Vortags. Statt binärer Suche
// genügen daher max. 4 Format-Aufrufe pro eindeutigem Tag; Ergebnisse werden
// zusätzlich im übergebenen Cache je Tag-String ("YYYY-MM-DD") abgelegt.
export function dashBerlinDayStart(ms: number, cache: Map<string, number>): number {
  const key = berlinDay.format(new Date(ms))
  const hit = cache.get(key)
  if (hit !== undefined) return hit
  const utcMidnight = Date.parse(`${key}T00:00:00Z`)
  let start = utcMidnight
  for (let back = 1; back <= 3; back += 1) {
    const candidate = utcMidnight - back * hourMs
    if (berlinDay.format(new Date(candidate)) !== key) break
    start = candidate
  }
  cache.set(key, start)
  return start
}
