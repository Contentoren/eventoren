import { createSignalObject } from "#ui/utils/createSignalObject.js"

export type UiKitTabelleOrderStatus = "bezahlt" | "offen" | "storniert" | "erstattet" | "teilerstattet"

export type UiKitTabelleOrder = {
  id: string
  number: string
  buyerName: string
  buyerEmail: string
  tickets: number
  totalCents: number
  createdAt: string
  status: UiKitTabelleOrderStatus
}

const firstNames = [
  "Anna",
  "Ben",
  "Clara",
  "David",
  "Elena",
  "Felix",
  "Greta",
  "Hannes",
  "Ines",
  "Jonas",
  "Klara",
  "Lukas",
  "Mara",
  "Nils",
  "Olivia",
  "Paul",
  "Rosa",
  "Simon",
  "Tessa",
  "Ulf",
]

const lastNames = [
  "Berger",
  "Falk",
  "Gruber",
  "Hoffmann",
  "Jäger",
  "Koch",
  "Lindner",
  "Meier",
  "Neumann",
  "Ostermann",
  "Peters",
  "Richter",
  "Schulz",
  "Thalmann",
  "Vogel",
  "Weber",
  "Yilmaz",
  "Zander",
  "Brandt",
  "Eichhorn",
]

const statuses: UiKitTabelleOrderStatus[] = [
  "bezahlt",
  "bezahlt",
  "bezahlt",
  "offen",
  "storniert",
  "erstattet",
  "teilerstattet",
]

const baseDate = new Date("2026-09-01T10:00:00+02:00").getTime()

function orderCreate(index: number): UiKitTabelleOrder {
  const first = firstNames[index % firstNames.length]!
  const last = lastNames[(index * 7) % lastNames.length]!
  const tickets = (index % 4) + 1
  const totalCents = (2450 + ((index * 137) % 4800)) * tickets
  const createdAt = new Date(baseDate + index * 36 * 3_600_000).toISOString()
  return {
    id: `order-${index + 1}`,
    number: `EV-26${String(4200 + index).padStart(4, "0")}`,
    buyerName: `${first} ${last}`,
    buyerEmail: `${first.toLowerCase()}.${last.toLowerCase()}@example.de`,
    tickets,
    totalCents,
    createdAt,
    status: statuses[index % statuses.length]!,
  }
}

/** Local demo state for the DataTable gallery: search, selection, toggles, and 40 fake orders. */
export function uiKitTabelleGalleryStateCreate() {
  const orders: UiKitTabelleOrder[] = Array.from({ length: 40 }, (_, index) => orderCreate(index))
  const search = createSignalObject("")
  const selectedKeys = createSignalObject<string[]>([])
  const loading = createSignalObject(false)
  const showEmpty = createSignalObject(false)
  const activeRowKey = createSignalObject<string | null>(null)

  const filtered = () => {
    const query = search.get().trim().toLowerCase()
    const source = showEmpty.get() ? [] : orders
    if (!query) return source
    return source.filter(
      (order) =>
        order.number.toLowerCase().includes(query) ||
        order.buyerName.toLowerCase().includes(query) ||
        order.buyerEmail.toLowerCase().includes(query),
    )
  }

  const searchChange = (value: string) => search.set(value)

  const searchClear = () => {
    search.set("")
    selectedKeys.set([])
  }

  const loadingChange = (next: boolean) => loading.set(next)

  const emptyChange = (next: boolean) => {
    showEmpty.set(next)
    if (next) selectedKeys.set([])
  }

  const rowOpen = (order: UiKitTabelleOrder) => activeRowKey.set(order.id)

  const selectionChange = (keys: string[]) => selectedKeys.set(keys)

  const activeRowClear = () => activeRowKey.set(null)

  return {
    search,
    selectedKeys,
    loading,
    showEmpty,
    activeRowKey,
    filtered,
    searchChange,
    searchClear,
    loadingChange,
    emptyChange,
    rowOpen,
    selectionChange,
    activeRowClear,
  }
}

export type UiKitTabelleGalleryState = ReturnType<typeof uiKitTabelleGalleryStateCreate>
