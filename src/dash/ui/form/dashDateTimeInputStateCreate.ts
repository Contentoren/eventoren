import { dashDateTimeJoin, dashDateTimeSplit } from "./dashDateTimeParts.ts"

export function dashDateTimeInputStateCreate(inputs: { localValue: () => string; onLocal: (next: string) => void }) {
  const dateValue = () => dashDateTimeSplit(inputs.localValue()).date
  const timeValue = () => dashDateTimeSplit(inputs.localValue()).time

  const dateInput = (date: string) => {
    const time = timeValue()
    inputs.onLocal(dashDateTimeJoin(date, time))
  }

  const timeInput = (time: string) => {
    const date = dateValue()
    if (!date) return
    inputs.onLocal(dashDateTimeJoin(date, time))
  }

  const dateMin = (localMin: string | undefined) => dashDateTimeSplit(localMin ?? "").date

  return { dateValue, timeValue, dateInput, timeInput, dateMin }
}

export type DashDateTimeInputFieldsState = ReturnType<typeof dashDateTimeInputStateCreate>
