import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { isServer } from "solid-js/web"
import { adminCatalogPageStateCreate } from "../src/admin/adminCatalogPageStateCreate.ts"
import { adminEventDetailsFormStateCreate } from "../src/admin/adminEventDetailsFormStateCreate.ts"
import type { AdminEventItem } from "../src/admin/AdminEventItem.ts"
import { createResult } from "../src/ui/createResult.ts"

if (isServer) {
  test("payment policy state passes with reactive Solid state", async () => {
    const process = Bun.spawn(["bun", "--conditions=browser", "test", import.meta.path], {
      stdout: "pipe",
      stderr: "pipe",
    })
    const [code, stdout, stderr] = await Promise.all([
      process.exited,
      new Response(process.stdout).text(),
      new Response(process.stderr).text(),
    ])
    expect(code, `${stdout}\n${stderr}`).toBe(0)
    expect(`${stdout}\n${stderr}`).toContain("3 pass")
  })
} else {
  const setup = (events: AdminEventItem[] = []) => {
    const saved: unknown[] = []
    const catalog = adminCatalogPageStateCreate({
      events: () => events,
      eventsLive: () => events,
      isServerAuthorized: () => true,
      reloadEvents: async () => createResult(events),
      eventUpsert: async (input) => {
        saved.push(input.allowedStripePaymentMethods)
        return createResult({ eventKey: input.eventKey, catalogVersion: 1 })
      },
    })
    const form = adminEventDetailsFormStateCreate({ catalog })
    return { catalog, form, saved }
  }

  test("new event defaults are collapsed and selection transitions never persist Allow all", () => {
    createRoot((dispose) => {
      try {
        const { catalog, form } = setup()
        expect(form.paymentSectionOpen()).toBe(false)
        expect(form.paymentSignal.get()).toEqual(["allow_all"])
        form.paymentSignal.set(["allow_all", "sepa_debit"])
        expect(catalog.eventDraft().allowedStripePaymentMethods).toEqual(["sepa_debit"])
        form.paymentSignal.set(["sepa_debit", "card"])
        expect(form.paymentSignal.get()).toEqual(["card", "sepa_debit"])
        form.paymentSignal.set(["card", "sepa_debit", "allow_all"])
        expect(catalog.eventDraft().allowedStripePaymentMethods).toBeUndefined()
        form.paymentSignal.set(["allow_all", "bancontact"])
        form.paymentSignal.set([])
        expect(form.paymentSignal.get()).toEqual(["allow_all"])
        expect(catalog.eventDraft().allowedStripePaymentMethods).toBeUndefined()
        expect(form.paymentOptions()).toEqual(["allow_all", "card", "klarna", "sepa_debit", "bancontact"])
        form.paymentSignal.set(["paypal"])
        expect(catalog.eventDraft().allowedStripePaymentMethods).toBeUndefined()
      } finally {
        dispose()
      }
    })
  })

  test("custom edit opens with saved selection and old events remain collapsed", () => {
    createRoot((dispose) => {
      try {
        const old = { id: "old", status: "draft", tiers: [], tags: [] } as unknown as AdminEventItem
        const custom = { ...old, id: "custom", allowedStripePaymentMethods: ["sepa_debit"] } as AdminEventItem
        const unavailable = { ...old, id: "unavailable", allowedStripePaymentMethods: ["paypal"] } as AdminEventItem
        const { catalog, form } = setup([old, custom, unavailable])
        catalog.selectEvent(custom)
        expect(form.paymentSectionOpen()).toBe(true)
        expect(form.paymentSignal.get()).toEqual(["sepa_debit"])
        form.paymentSignal.set(["sepa_debit", "allow_all"])
        expect(form.paymentSectionOpen()).toBe(true)
        catalog.selectEvent(old)
        expect(form.paymentSectionOpen()).toBe(false)
        expect(form.paymentSignal.get()).toEqual(["allow_all"])
        catalog.startNewEvent()
        expect(form.paymentSectionOpen()).toBe(false)
        // Reuse the same draft adapter for an existing unsupported policy; never broaden it silently.
        catalog.selectEvent(unavailable)
        expect(form.paymentSignal.get()).toEqual(["paypal"])
        expect(form.unavailablePaymentSelection()).toBe("paypal")
        form.paymentSignal.set(["paypal", "card"])
        expect(form.paymentSignal.get()).toEqual(["card", "paypal"])
        form.paymentSignal.set(["card", "paypal", "allow_all"])
        expect(catalog.eventDraft().allowedStripePaymentMethods).toBeUndefined()
      } finally {
        dispose()
      }
    })
  })

  test("save adapter canonicalizes custom policy and normalizes empty selections to absence", async () => {
    await createRoot(async (dispose) => {
      try {
        const { catalog, saved } = setup()
        catalog.eventFieldChange("eventKey", "policy-event")
        catalog.eventFieldChange("title", "Policy event")
        catalog.eventFieldChange("allowedStripePaymentMethods", ["bancontact", "card", "card"])
        await catalog.saveEvent()
        catalog.eventFieldChange("allowedStripePaymentMethods", [])
        await catalog.saveEvent()
        expect(saved).toEqual([["card", "bancontact"], undefined])
      } finally {
        dispose()
      }
    })
  })
}
