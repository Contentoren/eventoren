import { createSignalObject } from "#ui/utils/createSignalObject.js"

/** Zustand für die Notiz-Eingabe im Order-Sheet: reiner Eingabetext. */
export function dashOrderNotesStateCreate() {
  const text = createSignalObject("")
  return { text }
}

export type DashOrderNotesState = ReturnType<typeof dashOrderNotesStateCreate>
