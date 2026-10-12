import { describe, expect, mock, test } from "bun:test"
import type { EventTicketTier } from "../src/events/EventTicketTier.ts"
import type { TicketActivationCode } from "../src/ticketing/TicketActivationCode.ts"
import type { TicketActivationCodeExport } from "../src/ticketing/TicketActivationCodeExport.ts"
import type { TicketActivationCodeGenerateResult } from "../src/ticketing/TicketActivationCodeGenerateResult.ts"
import type { TicketActivationCodeListPage } from "../src/ticketing/TicketActivationCodeListPage.ts"

const solidJsClientPath = "solid-js/dist/solid.js"
const solid = (await import(solidJsClientPath)) as unknown as typeof import("solid-js")
mock.module("solid-js", () => solid)
const { createRoot, createSignal } = solid
const { adminActivationCodesStateCreate } = await import("../src/admin/adminActivationCodesStateCreate.ts")
mock.restore()

const flushEffects = async (rounds = 5) => {
  for (let index = 0; index < rounds; index++) {
    await Promise.resolve()
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

const tierCreate = (id: string, gated = false): EventTicketTier => ({
  id,
  name: `Product ${id}`,
  description: "",
  priceCents: 1000,
  feeCents: 0,
  capacity: 100,
  available: 100,
  activationCodeRequired: gated,
})

const codeCreate = (id: string, number: number, code: string): TicketActivationCode => ({
  id,
  number,
  code,
  status: "available",
  orderId: null,
  orderBookingReference: null,
  orderBookingNumber: null,
  customerEmail: null,
  customerGivenName: null,
  customerFamilyName: null,
  createdAt: "2026-10-12T00:00:00.000Z",
  updatedAt: "2026-10-12T00:00:00.000Z",
})

const pageCreate = (codes: readonly TicketActivationCode[]): TicketActivationCodeListPage => ({
  page: codes,
  continueCursor: "end",
  isDone: true,
})

describe("adminActivationCodesStateCreate tier reactivity", () => {
  test("falls back to a remaining product and resets the list when the selected product disappears", async () => {
    await createRoot(async (dispose) => {
      try {
        const [tiers, setTiers] = createSignal<readonly EventTicketTier[]>([tierCreate("a", true), tierCreate("b")])
        const listCalls: string[] = []
        const state = adminActivationCodesStateCreate({
          eventKey: () => "ev",
          tiers,
          listPage: async ({ tierKey }) => {
            listCalls.push(tierKey)
            if (tierKey === "a") return { success: true, data: pageCreate([codeCreate("ca", 1, "A1B2C3D4")]) }
            return { success: true, data: pageCreate([codeCreate("cb", 2, "Z8K4M2PQ")]) }
          },
        })

        await flushEffects()
        expect(state.selectedTierKey()).toBe("a")
        await flushEffects()
        expect(state.codes().map((code) => code.id)).toEqual(["ca"])

        // Archive/remove the selected product: only b remains.
        setTiers([tierCreate("b")])
        await flushEffects()
        await flushEffects()

        expect(state.selectedTierKey()).toBe("b")
        expect(state.selectedTier()?.id).toBe("b")
        expect(listCalls.at(-1)).toBe("b")
        expect(state.codes().map((code) => code.id)).toEqual(["cb"])

        // Removing every product clears the selection so generate/export cannot use a stale tier.
        setTiers([])
        await flushEffects()
        expect(state.selectedTierKey()).toBe("")
        expect(state.selectedTier()).toBeUndefined()
        expect(state.codes()).toEqual([])
      } finally {
        dispose()
      }
    })
  })

  test("ignores a stale list response from the previous product", async () => {
    await createRoot(async (dispose) => {
      try {
        const [tiers] = createSignal<readonly EventTicketTier[]>([tierCreate("a", true), tierCreate("b")])
        const resolvers: ((value: { success: true; data: TicketActivationCodeListPage }) => void)[] = []
        const seenTiers: string[] = []
        const state = adminActivationCodesStateCreate({
          eventKey: () => "ev",
          tiers,
          listPage: ({ tierKey }) => {
            seenTiers.push(tierKey)
            return new Promise((resolve) => {
              resolvers.push(resolve)
            })
          },
        })

        await flushEffects()
        expect(seenTiers[0]).toBe("a")

        // Explicit switch while the first product request is still pending.
        state.selectTier("b")
        await flushEffects()
        expect(seenTiers).toEqual(["a", "b"])

        resolvers[0]?.({ success: true, data: pageCreate([codeCreate("stale", 1, "STALE001")]) })
        await flushEffects()
        expect(state.codes()).toEqual([])

        resolvers[1]?.({ success: true, data: pageCreate([codeCreate("fresh", 2, "FRESH002")]) })
        await flushEffects()
        expect(state.codes().map((code) => code.id)).toEqual(["fresh"])
      } finally {
        dispose()
      }
    })
  })

  test("drops stale generate and export results after the product changes", async () => {
    await createRoot(async (dispose) => {
      try {
        const [tiers, setTiers] = createSignal<readonly EventTicketTier[]>([tierCreate("a", true), tierCreate("b")])
        let generateResolve!: (value: { success: true; data: TicketActivationCodeGenerateResult }) => void
        let exportResolve!: (value: { success: true; data: TicketActivationCodeExport }) => void
        const downloads: { filename: string }[] = []
        const state = adminActivationCodesStateCreate({
          eventKey: () => "ev",
          tiers,
          listPage: async () => ({ success: true, data: pageCreate([]) }),
          generate: () =>
            new Promise((resolve) => {
              generateResolve = resolve
            }),
          exportAll: () =>
            new Promise((resolve) => {
              exportResolve = resolve
            }),
          downloadBlob: ((_blob: Blob, filename: string) => {
            downloads.push({ filename })
          }) as (blob: Blob, filename: string) => void,
        })

        await flushEffects()
        expect(state.selectedTierKey()).toBe("a")

        const generating = state.generate()
        const exporting = state.exportCsv()
        // Switch products while both operations are pending.
        setTiers([tierCreate("b")])
        await flushEffects()

        generateResolve({
          success: true,
          data: {
            eventKey: "ev",
            tierKey: "a",
            generated: [{ id: "g1", number: 1, code: "OLDCODE1", status: "available" }],
            lastNumber: 1,
          },
        })
        exportResolve({
          success: true,
          data: { eventName: "Old", productName: "Old", codes: [{ number: 1, code: "OLD" }] },
        })
        await generating
        await exporting
        await flushEffects()

        expect(state.selectedTierKey()).toBe("b")
        expect(state.feedback()).toBe("")
        expect(downloads).toEqual([])
        expect(state.errorMessage()).toBe("")
      } finally {
        dispose()
      }
    })
  })
})
