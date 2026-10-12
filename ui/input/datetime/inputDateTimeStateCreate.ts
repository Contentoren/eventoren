import { createEffect } from "solid-js"
import { timeOptions5MinGenerate } from "#ui/input/datetime/timeOptions5MinGenerate.js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"

export function inputDateTimeStateCreate(p: {
  value: () => string | undefined
  onInput?: (value: string) => void
  min?: () => string | undefined
  max?: () => string | undefined
  id?: () => string | undefined
}) {
  const timeOptions = timeOptions5MinGenerate()
  const timeOptionSet = new Set(timeOptions)
  const dateSignal = createSignalObject("")
  const timeSignal = createSignalObject("")

  const valueParse = (raw: string | undefined): { date: string; time: string } => {
    if (!raw) return { date: "", time: "" }
    const separator = raw.indexOf("T")
    if (separator < 0) return { date: raw, time: "" }
    return { date: raw.slice(0, separator), time: raw.slice(separator + 1, separator + 6) }
  }

  let lastParent = p.value() ?? ""
  const initial = valueParse(lastParent)
  dateSignal.set(initial.date)
  timeSignal.set(initial.time)

  const valueSync = () => {
    const current = p.value() ?? ""
    if (current === lastParent) return
    lastParent = current
    const parsed = valueParse(current)
    if (parsed.date !== dateSignal.get()) dateSignal.set(parsed.date)
    if (parsed.time !== timeSignal.get()) timeSignal.set(parsed.time)
  }

  createEffect(() => {
    valueSync()
  })

  const date = () => {
    valueSync()
    return dateSignal.get()
  }

  const time = () => {
    valueSync()
    return timeSignal.get()
  }

  const customTime = (): string | undefined => {
    const current = time()
    if (!current) return undefined
    if (timeOptionSet.has(current)) return undefined
    return current
  }

  const dateMin = (): string | undefined => p.min?.()?.split("T")[0]
  const dateMax = (): string | undefined => p.max?.()?.split("T")[0]
  const timeId = (): string | undefined => {
    const base = p.id?.()
    if (!base) return undefined
    return `${base}-time`
  }

  const emitCombined = (nextDate: string, nextTime: string) => {
    p.onInput?.(`${nextDate}T${nextTime}`)
  }

  const emitCleared = () => {
    p.onInput?.("")
  }

  const dateChange = (nextDate: string) => {
    valueSync()
    dateSignal.set(nextDate)
    const currentTime = timeSignal.get()
    if (!nextDate) {
      emitCleared()
      return
    }
    if (!currentTime) return
    emitCombined(nextDate, currentTime)
  }

  const timeChange = (nextTime: string) => {
    valueSync()
    timeSignal.set(nextTime)
    const currentDate = dateSignal.get()
    if (!currentDate) return
    if (!nextTime) {
      emitCleared()
      return
    }
    emitCombined(currentDate, nextTime)
  }

  return { date, time, timeOptions, customTime, dateMin, dateMax, timeId, dateChange, timeChange }
}
