import { expect, test } from "bun:test"
import type { DataTableColumn } from "./DataTableColumn.ts"
import { dataTableSort } from "./dataTableSort.ts"

type OrderRow = { number: string; buyer: string; tickets: number; totalCents: number | null }

const columns: DataTableColumn<OrderRow>[] = [
  { id: "number", header: "Nummer", cell: (row) => row.number, sortValue: (row) => row.number },
  { id: "buyer", header: "Käufer", cell: (row) => row.buyer, sortValue: (row) => row.buyer },
  { id: "tickets", header: "Tickets", cell: (row) => String(row.tickets), sortValue: (row) => row.tickets },
  { id: "total", header: "Betrag", cell: (row) => String(row.totalCents), sortValue: (row) => row.totalCents },
]

const rows: OrderRow[] = [
  { number: "EV-260011", buyer: "Özlem Yilmaz", tickets: 2, totalCents: 5900 },
  { number: "EV-260002", buyer: "Anna Berger", tickets: 10, totalCents: 24500 },
  { number: "EV-260003", buyer: "äron Falk", tickets: 1, totalCents: null },
]

test("sorts numbers ascending and descending", () => {
  expect(dataTableSort(rows, columns[2]!, "asc").map((row) => row.tickets)).toEqual([1, 2, 10])
  expect(dataTableSort(rows, columns[2]!, "desc").map((row) => row.tickets)).toEqual([10, 2, 1])
})

test("orders order numbers naturally with german collation", () => {
  expect(dataTableSort(rows, columns[0]!, "asc").map((row) => row.number)).toEqual([
    "EV-260002",
    "EV-260003",
    "EV-260011",
  ])
})

test("sorts german names case-insensitively", () => {
  expect(dataTableSort(rows, columns[1]!, "asc").map((row) => row.buyer)).toEqual([
    "Anna Berger",
    "äron Falk",
    "Özlem Yilmaz",
  ])
})

test("keeps rows with missing sort values at the end", () => {
  expect(dataTableSort(rows, columns[3]!, "asc").map((row) => row.totalCents)).toEqual([5900, 24500, null])
  expect(dataTableSort(rows, columns[3]!, "desc").map((row) => row.totalCents)).toEqual([null, 24500, 5900])
})

test("does not mutate the input rows", () => {
  const before = [...rows]
  dataTableSort(rows, columns[2]!, "asc")
  expect(rows).toEqual(before)
})
