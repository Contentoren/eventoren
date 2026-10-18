import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import type { SheetSize } from "#ui/interactive/sheet/Sheet.jsx"
import { createSignalObject } from "#ui/utils/createSignalObject.js"

const galleryFormTitleInitial = "Indie Night: Lichtspiel"
const galleryFormOrtInitial = "Kulturhaus Lindenhof, Halle"

/** Local demo state for the overlay kit gallery: sheet, confirms, nested dialogs and mini form. */
export function uiKitOverlaysGalleryStateCreate() {
  const sheetSize = createSignalObject<SheetSize>("md")
  const sheetOpen = createSignalObject(false)
  const confirmDangerOpen = createSignalObject(false)
  const confirmNameOpen = createSignalObject(false)
  const nestedOpen = createSignalObject(false)
  const nestedModalOpen = createSignalObject(false)
  const nestedConfirmOpen = createSignalObject(false)
  const nestedNote = createSignalObject("")
  const saving = createSignalObject(false)
  const savedTitle = createSignalObject(galleryFormTitleInitial)
  const savedOrt = createSignalObject(galleryFormOrtInitial)
  const title = createSignalObject(galleryFormTitleInitial)
  const ort = createSignalObject(galleryFormOrtInitial)

  const openSheet = (size: SheetSize) => {
    sheetSize.set(size)
    sheetOpen.set(true)
  }

  const closeSheet = (open: boolean) => {
    sheetOpen.set(open)
  }

  const closeDanger = (open: boolean) => {
    confirmDangerOpen.set(open)
  }

  const closeName = (open: boolean) => {
    confirmNameOpen.set(open)
  }

  const dirty = () => title.get() !== savedTitle.get() || ort.get() !== savedOrt.get()

  const discard = () => {
    title.set(savedTitle.get())
    ort.set(savedOrt.get())
  }

  const save = () => {
    if (!dirty()) return
    if (saving.get()) return
    saving.set(true)
    const later = () => {
      savedTitle.set(title.get())
      savedOrt.set(ort.get())
      saving.set(false)
      toastAdd({
        title: "Gespeichert",
        description: "Deine Änderungen sind übernommen.",
        variant: "success",
      })
    }
    if (typeof window === "undefined") {
      later()
      return
    }
    window.setTimeout(later, 600)
  }

  const confirmDanger = () => {
    confirmDangerOpen.set(false)
    toastAdd({
      title: "Event abgesagt",
      description: "Alle Käufer bekommen eine E-Mail.",
      variant: "success",
    })
  }

  const confirmName = () => {
    confirmNameOpen.set(false)
    toastAdd({
      title: "„Indie Night“ abgesagt",
      description: "Die Absage ist verschickt.",
      variant: "success",
    })
  }

  const closeNested = (open: boolean) => {
    nestedOpen.set(open)
  }

  const closeNestedModal = (open: boolean) => {
    nestedModalOpen.set(open)
  }

  const closeNestedConfirm = (open: boolean) => {
    nestedConfirmOpen.set(open)
  }

  const submitNestedNote = () => {
    if (nestedNote.get().trim().length === 0) return
    nestedNote.set("")
    nestedModalOpen.set(false)
    toastAdd({
      title: "Notiz gespeichert",
      description: "Der Hinweis steht jetzt in der Bestellübersicht.",
      variant: "success",
    })
  }

  const confirmNestedRefund = () => {
    nestedConfirmOpen.set(false)
    toastAdd({
      title: "Erstattung vorgemerkt",
      description: "Die Erstattung wird an die Käuferin überwiesen.",
      variant: "success",
    })
  }

  return {
    sheetSize,
    sheetOpen,
    confirmDangerOpen,
    confirmNameOpen,
    nestedOpen,
    nestedModalOpen,
    nestedConfirmOpen,
    nestedNote,
    saving,
    title,
    ort,
    openSheet,
    closeSheet,
    closeDanger,
    closeName,
    closeNested,
    closeNestedModal,
    closeNestedConfirm,
    submitNestedNote,
    confirmNestedRefund,
    dirty,
    discard,
    save,
    confirmDanger,
    confirmName,
  }
}
