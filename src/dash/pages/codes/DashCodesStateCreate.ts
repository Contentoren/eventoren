import { createSignalObject } from "#ui/utils/createSignalObject.js"

export type DashCodesState = {
  selectedKeys: ReturnType<typeof createSignalObject<string[]>>
  limitOpen: ReturnType<typeof createSignalObject<boolean>>
  limitValue: ReturnType<typeof createSignalObject<string>>
  validityOpen: ReturnType<typeof createSignalObject<boolean>>
  validityValue: ReturnType<typeof createSignalObject<string | null>>
  deleteOpen: ReturnType<typeof createSignalObject<boolean>>
}

/** Listen-State der Codeseite: Auswahl plus Bulk-Dialoge. */
export function DashCodesStateCreate(): DashCodesState {
  return {
    selectedKeys: createSignalObject<string[]>([]),
    limitOpen: createSignalObject(false),
    limitValue: createSignalObject(""),
    validityOpen: createSignalObject(false),
    validityValue: createSignalObject<string | null>(null),
    deleteOpen: createSignalObject(false),
  }
}
