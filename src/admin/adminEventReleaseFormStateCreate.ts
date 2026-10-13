import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { AdminCatalogPageState } from "./AdminCatalogPageState.ts"
import { adminEventReleaseDateTimeToIso } from "./adminEventReleaseDateTimeToIso.ts"
import { adminEventReleaseDateTimeFromIso } from "./adminEventReleaseDateTimeFromIso.ts"

export function adminEventReleaseFormStateCreate(inputs: { catalog: () => AdminCatalogPageState }) {
  const validation = createSignalObject("")
  const value = () => adminEventReleaseDateTimeFromIso(inputs.catalog().eventDraft().bookingOpensAt)
  const change = (local: string) => {
    const result = adminEventReleaseDateTimeToIso(local)
    if (!result.success) {
      validation.set(result.errorMessage)
      return
    }
    validation.set("")
    inputs.catalog().eventFieldChange("bookingOpensAt", result.data)
  }
  // InputDateTime does not emit incomplete date/time selections. Read both controls
  // at submit (and on bubbled input/change) so a partial selection cannot save.
  const formValidate = (form: HTMLFormElement) => {
    const date = form.querySelector<HTMLInputElement>('input[type="date"]')?.value ?? ""
    const time = form.querySelector<HTMLSelectElement>("select")?.value ?? ""
    const local = date || time ? `${date}T${time}` : ""
    const result = adminEventReleaseDateTimeToIso(local)
    if (!result.success) {
      validation.set(result.errorMessage)
      return false
    }
    change(local)
    return true
  }
  const input = (event: Event & { currentTarget: HTMLFormElement }) => {
    formValidate(event.currentTarget)
  }
  const submit = async (event: SubmitEvent & { currentTarget: HTMLFormElement }) => {
    event.preventDefault()
    if (inputs.catalog().isSaving() || !formValidate(event.currentTarget)) return
    await inputs.catalog().saveEvent()
  }
  const clear = (event: MouseEvent & { currentTarget: HTMLButtonElement }) => {
    const form = event.currentTarget.form
    if (form) {
      const date = form.querySelector<HTMLInputElement>('input[type="date"]')
      const time = form.querySelector<HTMLSelectElement>("select")
      if (date) date.value = ""
      if (time) time.value = ""
    }
    change("")
  }
  return {
    value,
    change,
    input,
    submit,
    clear,
    timezone: () => "Europe/Berlin (deutsche Zeit)",
    validation: validation.get,
  }
}
