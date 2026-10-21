import { expect, mock, test } from "bun:test"
import type { ConvexClient } from "convex/browser"
import { createResult, createResultError } from "#result"

const solidJsClientPath = "solid-js/dist/solid.js"
type SolidJsModule = typeof import("solid-js")
const solid = (await import(solidJsClientPath)) as unknown as SolidJsModule
mock.module("solid-js", () => solid)
const { createSignalObject } = await import("#ui/utils/createSignalObject.js")
const { eventorenAuthContext } = await import("#src/auth/ui/eventorenAuthContext.ts")
const { convexClientContext } = await import("#src/utils/convex_client/convexClientContext.ts")
const { veranstalterDashboardEventDetailStateCreate } = await import("./veranstalterDashboardEventDetailStateCreate.ts")
mock.restore()

function detailCreate(orgId = "A", eventKey = "C", name = "Loaded tier") {
  return createResult({
    orgId,
    eventKey,
    status: "draft",
    title: `Event ${eventKey}`,
    faqs: [{ id: "faq", question: "Where?", answer: "Here" }],
    schedule: [],
    tiers: [{ tierKey: "shared", name, description: "", priceCents: 1200, capacity: 80 }],
  })
}

function harnessCreate() {
  const orgId = createSignalObject("A")
  const eventKey = createSignalObject("C")
  const tierKey = createSignalObject<string | undefined>(undefined)
  const calls: Record<string, unknown>[] = []
  const navigation: string[] = []
  const subscriptions: { args: Record<string, unknown>; push: (value: unknown) => void; active: boolean }[] = []
  let respond: (() => Promise<unknown>) | undefined
  const client = {
    mutation: async (_reference: unknown, args: Record<string, unknown>) => {
      calls.push(args)
      return respond ? respond() : createResult({ tierKey: "saved" })
    },
    onUpdate: (_query: unknown, args: Record<string, unknown>, push: (value: unknown) => void) => {
      const subscription = { args, push, active: true }
      subscriptions.push(subscription)
      return () => {
        subscription.active = false
      }
    },
  } as unknown as ConvexClient
  let state: ReturnType<typeof veranstalterDashboardEventDetailStateCreate> | undefined
  const dispose = solid.createRoot((disposeRoot) => {
    solid.createComponent(convexClientContext.Provider, {
      value: client,
      get children() {
        return solid.createComponent(eventorenAuthContext.Provider, {
          value: { ...eventorenAuthContext.defaultValue, token: () => "validated-token", ready: () => true },
          get children() {
            state = veranstalterDashboardEventDetailStateCreate({
              orgId: orgId.get,
              eventKey: eventKey.get,
              tierKey: tierKey.get,
              confirm: () => undefined,
              canEdit: () => true,
              canManageTiers: () => true,
              openTier: tierKey.set,
              closeTier: () => {
                navigation.push("closeTier")
                tierKey.set(undefined)
              },
              openConfirm: () => undefined,
              closeConfirm: () => {
                navigation.push("closeConfirm")
              },
              toList: () => {
                navigation.push("toList")
              },
            })
            return undefined
          },
        })
      },
    })
    return disposeRoot
  })
  if (!state) throw new Error("No event state in providers")
  const push = (result: unknown = detailCreate(orgId.get(), eventKey.get())) => {
    const subscription = subscriptions.findLast(
      (entry) => entry.active && entry.args.orgId === orgId.get() && entry.args.eventKey === eventKey.get(),
    )
    if (!subscription) throw new Error("No current event subscription")
    subscription.push(result)
  }
  return {
    state,
    orgId,
    eventKey,
    tierKey,
    calls,
    navigation,
    push,
    dispose,
    defer: (response: () => Promise<unknown>) => {
      respond = response
    },
  }
}

for (const switchField of ["eventKey", "orgId"] as const) {
  test(`new-tier draft resets immediately on ${switchField} changes and does not save into an unloaded event`, async () => {
    const h = harnessCreate()
    try {
      h.push()
      h.tierKey.set("neu")
      h.state.tierFieldChange("name", "Draft C")
      h.state.tierFieldChange("capacity", "10")
      h[switchField].set(switchField === "eventKey" ? "D" : "B")
      expect(h.state.tierDraft().name).toBe("")
      h.state.tierFieldChange("name", "Draft D")
      h.state.tierFieldChange("capacity", "20")
      h.state.tierFieldChange("priceEuros", "12")
      await h.state.tierSave()
      expect(h.calls).toHaveLength(0)
      h.push()
      await h.state.tierSave()
      expect(h.calls).toHaveLength(1)
      expect(h.calls[0]?.name).toBe("Draft D")
      expect(h.calls[0]?.orgId).toBe(h.orgId.get())
      expect(h.calls[0]?.eventKey).toBe(h.eventKey.get())
    } finally {
      h.dispose()
    }
  })

  test(`identical existing tier keys seed separately per ${switchField} and preserve same-scope edits`, () => {
    const h = harnessCreate()
    try {
      h.push()
      h.tierKey.set("shared")
      h.state.tierFieldChange("name", "Unsaved C")
      h.push(detailCreate("A", "C", "Server C refresh"))
      expect(h.state.tierDraft().name).toBe("Unsaved C")
      h[switchField].set(switchField === "eventKey" ? "D" : "B")
      expect(h.state.tierDraft().name).toBe("")
      h.push(detailCreate(h.orgId.get(), h.eventKey.get(), "Loaded D"))
      expect(h.state.tierDraft().name).toBe("Loaded D")
      h.tierKey.set(undefined)
      h.tierKey.set("shared")
      expect(h.state.tierDraft().name).toBe("Loaded D")
    } finally {
      h.dispose()
    }
  })
}

test("tier save rejects a successful query payload with mismatched org or event", async () => {
  const h = harnessCreate()
  try {
    h.tierKey.set("neu")
    h.state.tierFieldChange("name", "Local")
    h.state.tierFieldChange("capacity", "10")
    h.state.tierFieldChange("priceEuros", "12")
    for (const result of [detailCreate("B", "C"), detailCreate("A", "D")]) {
      h.push(result)
      expect(h.state.detail()).toBeUndefined()
      await h.state.tierSave()
      expect(h.calls).toHaveLength(0)
    }
  } finally {
    h.dispose()
  }
})

for (const returnToA of [false, true]) {
  test(`old FAQ patch failure does not appear after event C -> D${returnToA ? " -> C" : ""}`, async () => {
    const h = harnessCreate()
    try {
      h.push()
      h.state.faqChange("faq", "answer", "Old draft")
      let finish: ((value: unknown) => void) | undefined
      h.defer(
        () =>
          new Promise((resolve) => {
            finish = resolve
          }),
      )
      const oldRequest = h.state.patchSave()
      for (let n = 0; n < 20 && !finish; n++) await Promise.resolve()
      if (!finish) throw new Error("Patch did not reach the provider")
      h.eventKey.set("D")
      if (returnToA) h.eventKey.set("C")
      h.push()
      h.state.faqChange("faq", "answer", "New draft")
      finish(createResultError("probe", "Old FAQ failure"))
      await oldRequest
      expect(h.state.failure()).toBeNull()
      expect(h.state.faqRows()[0]?.answer).toBe("New draft")
    } finally {
      h.dispose()
    }
  })
}

for (const action of ["tierSave", "confirmTierArchive"] as const) {
  for (const outcome of ["success", "failure"] as const) {
    test(`${action} ignores stale ${outcome} after leaving and reopening the same tier within one event`, async () => {
      const h = harnessCreate()
      try {
        h.push()
        h.tierKey.set("shared")
        let finish!: (value: unknown) => void
        h.defer(
          () =>
            new Promise((resolve) => {
              finish = resolve
            }),
        )
        const oldRequest = h.state[action]()
        h.tierKey.set("neu")
        h.tierKey.set("shared")
        h.state.tierFieldChange("name", "Reopened draft")
        // Within one event, pending is shared until the old request finishes.
        expect(h.state.pending()).toBe(true)
        await h.state[action]()
        expect(h.calls).toHaveLength(1)
        finish(
          outcome === "success" ? createResult({ tierKey: "saved" }) : createResultError("probe", "Old tier failure"),
        )
        await oldRequest
        expect(h.state.failure()).toBeNull()
        expect(h.state.tierDraft().name).toBe("Reopened draft")
        expect(h.navigation).toEqual([])
        expect(h.state.pending()).toBe(false)
      } finally {
        h.dispose()
      }
    })
  }
}

const actions = ["patchSave", "tierSave", "confirmTierArchive", "publish", "confirmEventArchive"] as const
for (const action of actions) {
  for (const outcome of ["success", "failure"] as const) {
    for (const [scopeField, returnToA] of [
      ["orgId", false],
      ["orgId", true],
      ["eventKey", false],
      ["eventKey", true],
    ] as const) {
      test(`${action} ignores stale ${outcome} after ${scopeField} switch${returnToA ? " and return" : ""} without releasing a newer pending request`, async () => {
        const h = harnessCreate()
        try {
          h.push()
          h.tierKey.set("shared")
          h.state.faqChange("faq", "answer", "Old draft")
          const completions: ((value: unknown) => void)[] = []
          h.defer(() => new Promise((resolve) => completions.push(resolve)))
          const oldRequest = h.state[action]()
          // patch parsing is async; wait for the actual provider mutation dispatch.
          for (let n = 0; n < 20 && completions.length === 0; n++) await Promise.resolve()
          expect(completions).toHaveLength(1)
          h[scopeField].set(scopeField === "orgId" ? "B" : "D")
          expect(h.state.pending()).toBe(false)
          if (returnToA) h[scopeField].set(scopeField === "orgId" ? "A" : "C")
          h.push()
          h.state.faqChange("faq", "answer", "New draft")
          h.state.tierFieldChange("name", "New tier draft")
          const newRequest = h.state[action]()
          for (let n = 0; n < 20 && completions.length < 2; n++) await Promise.resolve()
          expect(completions).toHaveLength(2)
          completions[0]!(
            outcome === "success" ? createResult({ tierKey: "saved" }) : createResultError("probe", "Old failure"),
          )
          await oldRequest
          expect(h.state.pending()).toBe(true)
          expect(h.state.failure()).toBeNull()
          expect(h.state.faqRows()[0]?.answer).toBe("New draft")
          expect(h.state.tierDraft().name).toBe("New tier draft")
          expect(h.navigation).toEqual([])
          completions[1]!(createResult({ tierKey: "saved" }))
          await newRequest
          expect(h.state.pending()).toBe(false)
        } finally {
          h.dispose()
        }
      })
    }
  }
}
