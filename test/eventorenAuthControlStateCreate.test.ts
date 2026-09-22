import { expect, test } from "bun:test"
import { eventorenAuthControlStateCreate } from "../src/auth/ui/eventorenAuthControlStateCreate.ts"

test("keeps logout state and navigation untouched when the server rejects logout", async () => {
  const previousFetch = globalThis.fetch
  const previousWindow = globalThis.window
  let assignedHref = ""
  globalThis.fetch = Object.assign(async () => new Response("logout failed", { status: 503 }), {
    preconnect: previousFetch.preconnect,
  })
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location: { assign: (href: string) => (assignedHref = href) } },
  })

  try {
    const state = eventorenAuthControlStateCreate()
    await state.logout({ preventDefault: () => undefined } as SubmitEvent)

    expect(assignedHref).toBe("")
    expect(state.errorMessage()).toBe("Die Abmeldung konnte nicht abgeschlossen werden.")
  } finally {
    globalThis.fetch = previousFetch
    if (previousWindow === undefined) delete (globalThis as { window?: Window }).window
    else Object.defineProperty(globalThis, "window", { configurable: true, value: previousWindow })
  }
})

test("clears logout state and navigates only after a successful server logout", async () => {
  const previousFetch = globalThis.fetch
  const previousWindow = globalThis.window
  const previousLocalStorage = globalThis.localStorage
  let assignedHref = ""
  globalThis.fetch = Object.assign(async () => new Response(null, { status: 204 }), {
    preconnect: previousFetch.preconnect,
  })
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location: { assign: (href: string) => (assignedHref = href) } },
  })
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined },
  })

  try {
    const state = eventorenAuthControlStateCreate()
    await state.logout({ preventDefault: () => undefined } as SubmitEvent)

    expect(assignedHref).toBe("/")
    expect(state.errorMessage()).toBe("")
  } finally {
    globalThis.fetch = previousFetch
    if (previousWindow === undefined) delete (globalThis as { window?: Window }).window
    else Object.defineProperty(globalThis, "window", { configurable: true, value: previousWindow })
    if (previousLocalStorage === undefined) delete (globalThis as { localStorage?: Storage }).localStorage
    else Object.defineProperty(globalThis, "localStorage", { configurable: true, value: previousLocalStorage })
  }
})
