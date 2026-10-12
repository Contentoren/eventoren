import { describe, expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { isServer } from "solid-js/web"
import { adminCatalogPageStateCreate } from "../src/admin/adminCatalogPageStateCreate.ts"
import { adminEventDetailsFormStateCreate } from "../src/admin/adminEventDetailsFormStateCreate.ts"
import type { AdminEventItem } from "../src/admin/AdminEventItem.ts"
import { createResult } from "../src/ui/createResult.ts"

const unavailableUrl = "https://eventoren.contentoren.de/readiness-technical-draft.png"
const workingUrl = "https://example.com/available.webp"
const variants = {
  assetId: "uploaded-image",
  detail: "https://example.com/detail.webp",
  card: "https://example.com/card.webp",
  organizer: "https://example.com/organizer.webp",
}

const eventCreate = (id: string, imageUrl: string): AdminEventItem => ({
  id,
  status: "draft",
  catalogVersion: 1,
  title: id,
  subtitle: "",
  description: "",
  category: "konzerte",
  startsAt: "",
  endsAt: "",
  doorsAt: "",
  venue: "",
  city: "",
  address: "",
  organizer: "",
  imageUrl,
  imageAlt: "",
  tags: [],
  soldOut: false,
  tiers: [],
})

// Solid's server memos do not react to source changes; exercise the browser runtime in isolation.
if (isServer) {
  test("image preview failure and recovery regressions pass with reactive Solid state", async () => {
    const subprocess = Bun.spawn(["bun", "--conditions=browser", "test", import.meta.path], {
      stdout: "pipe",
      stderr: "pipe",
    })
    const [exitCode, stdout, stderr] = await Promise.all([
      subprocess.exited,
      new Response(subprocess.stdout).text(),
      new Response(subprocess.stderr).text(),
    ])
    expect(exitCode, `${stdout}\n${stderr}`).toBe(0)
    expect(`${stdout}\n${stderr}`).toContain("10 pass")
  })
} else {
  describe("admin event image preview", () => {
    const setup = (events: AdminEventItem[] = []) => {
      const catalog = adminCatalogPageStateCreate({
        events: () => events,
        isServerAuthorized: () => true,
        reloadEvents: async () => createResult(events),
        imageUpload: async () => createResult(variants),
      })
      const form = adminEventDetailsFormStateCreate({ catalog })
      return { catalog, form }
    }

    test("marks an unavailable preview failed without changing its URL or event data", () => {
      createRoot((dispose) => {
        try {
          const { catalog, form } = setup()
          form.imageUrlChange(unavailableUrl)
          const draft = catalog.eventDraft()
          const preview = form.imagePreview()!
          expect(preview.failed()).toBe(false)
          preview.onError()
          expect(preview.failed()).toBe(true)
          expect(catalog.eventDraft()).toEqual(draft)
          expect(catalog.eventDraft().imageUrl).toBe(unavailableUrl)
        } finally {
          dispose()
        }
      })
    })

    test("recovers after a manual resolved source change but not an unrelated edit or equivalent URL", () => {
      createRoot((dispose) => {
        try {
          const { catalog, form } = setup()
          form.imageUrlChange(unavailableUrl)
          const failedPreview = form.imagePreview()!
          failedPreview.onError()
          catalog.eventFieldChange("title", "Changed title")
          form.imageUrlChange(` ${unavailableUrl} `)
          expect(form.imagePreview()).toBe(failedPreview)
          expect(form.imagePreview()!.failed()).toBe(true)
          form.imageUrlChange(workingUrl)
          expect(form.imagePreview()!.src).toBe(workingUrl)
          expect(form.imagePreview()!.failed()).toBe(false)
          form.imageUrlChange(unavailableUrl)
          expect(form.imagePreview()).not.toBe(failedPreview)
          expect(form.imagePreview()!.failed()).toBe(false)
        } finally {
          dispose()
        }
      })
    })

    test("ignores stale failures even when returning to the same earlier source", () => {
      createRoot((dispose) => {
        try {
          const { form } = setup()
          form.imageUrlChange(unavailableUrl)
          const oldPreview = form.imagePreview()!
          form.imageUrlChange(workingUrl)
          oldPreview.onError()
          expect(form.imagePreview()!.failed()).toBe(false)
          form.imageUrlChange(unavailableUrl)
          oldPreview.onError()
          expect(form.imagePreview()!.failed()).toBe(false)
          form.imagePreview()!.onError()
          expect(form.imagePreview()!.failed()).toBe(true)
        } finally {
          dispose()
        }
      })
    })

    test("keeps a blank URL hidden even with variants and recovers after clearing a failed URL", () => {
      createRoot((dispose) => {
        try {
          const { catalog, form } = setup()
          expect(form.imagePreview()).toBeUndefined()
          catalog.eventFieldChange("imageVariants", variants)
          expect(form.imagePreview()).toBeUndefined()
          form.imageUrlChange(unavailableUrl)
          const oldPreview = form.imagePreview()!
          oldPreview.onError()
          form.imageUrlChange("")
          oldPreview.onError()
          expect(form.imagePreview()).toBeUndefined()
          form.imageUrlChange(unavailableUrl)
          expect(form.imagePreview()!.failed()).toBe(false)
        } finally {
          dispose()
        }
      })
    })

    test("prefers the detail variant and resets only when the resolved variant source changes", () => {
      createRoot((dispose) => {
        try {
          const { catalog, form } = setup()
          form.imageUrlChange(unavailableUrl)
          catalog.eventFieldChange("imageVariants", variants)
          const preview = form.imagePreview()!
          expect(preview.src).toBe(variants.detail)
          preview.onError()
          catalog.eventFieldChange("imageUrl", workingUrl)
          catalog.eventFieldChange("imageVariants", { ...variants, card: "different-card" })
          expect(form.imagePreview()).toBe(preview)
          expect(form.imagePreview()!.failed()).toBe(true)
          catalog.eventFieldChange("imageVariants", { ...variants, detail: workingUrl })
          expect(form.imagePreview()!.src).toBe(workingUrl)
          expect(form.imagePreview()!.failed()).toBe(false)
          form.imageUrlChange(unavailableUrl)
          expect(catalog.eventDraft().imageVariants).toBeUndefined()
          expect(form.imagePreview()!.src).toBe(unavailableUrl)
        } finally {
          dispose()
        }
      })
    })

    test("recovers after uploaded variants replace a failed preview and ignores its late failure", async () => {
      await createRoot(async (dispose) => {
        try {
          const { catalog, form } = setup()
          form.imageUrlChange(unavailableUrl)
          const oldPreview = form.imagePreview()!
          oldPreview.onError()
          await form.imageUpload(new File(["image"], "event.png", { type: "image/png" }))
          oldPreview.onError()
          expect(catalog.eventDraft().imageVariants).toEqual(variants)
          expect(form.imagePreview()!.src).toBe(variants.detail)
          expect(form.imagePreview()!.failed()).toBe(false)
        } finally {
          dispose()
        }
      })
    })

    test("recovers when selecting another event source without allowing a stale failure", () => {
      createRoot((dispose) => {
        try {
          const unavailable = eventCreate("readiness-technical-draft-20260914", unavailableUrl)
          const available = eventCreate("available-event", workingUrl)
          const { catalog, form } = setup([unavailable, available])
          catalog.selectEvent(unavailable)
          const oldPreview = form.imagePreview()!
          oldPreview.onError()
          catalog.selectEvent(available)
          oldPreview.onError()
          expect(form.imagePreview()!.src).toBe(workingUrl)
          expect(form.imagePreview()!.failed()).toBe(false)
          catalog.selectEvent(unavailable)
          oldPreview.onError()
          expect(form.imagePreview()!.failed()).toBe(false)
          expect(catalog.eventDraft().imageUrl).toBe(unavailableUrl)
        } finally {
          dispose()
        }
      })
    })

    test("shows an immediate local preview during file upload", async () => {
      await createRoot(async (dispose) => {
        try {
          let resolveUpload!: (value: { readonly success: true; readonly data: typeof variants }) => void
          const gate = new Promise<{ readonly success: true; readonly data: typeof variants }>((resolve) => {
            resolveUpload = resolve
          })
          const catalog = adminCatalogPageStateCreate({
            events: () => [],
            isServerAuthorized: () => true,
            reloadEvents: async () => createResult([]),
            imageUpload: () => gate,
          })
          const form = adminEventDetailsFormStateCreate({ catalog })
          expect(form.imagePreview()).toBeUndefined()
          const uploadTask = form.imageUpload(new File(["image"], "event.png", { type: "image/png" }))
          expect(form.imageUploading()).toBe(true)
          const preview = form.imagePreview()
          expect(preview).toBeDefined()
          expect(preview!.src.length).toBeGreaterThan(0)
          expect(preview!.src).not.toBe(variants.detail)
          resolveUpload(createResult(variants))
          await uploadTask
          expect(form.imageUploading()).toBe(false)
          expect(catalog.eventDraft().imageUrl).toBe(variants.detail)
          expect(form.imagePreview()!.src).toBe(variants.detail)
        } finally {
          dispose()
        }
      })
    })

    test("submit during active upload waits for upload and saves with the uploaded image", async () => {
      await createRoot(async (dispose) => {
        try {
          let resolveUpload!: (value: { readonly success: true; readonly data: typeof variants }) => void
          const gate = new Promise<{ readonly success: true; readonly data: typeof variants }>((resolve) => {
            resolveUpload = resolve
          })
          const savedInputs: Array<{ imageUrl: string; eventKey: string }> = []
          const catalog = adminCatalogPageStateCreate({
            events: () => [],
            eventsLive: () => [],
            isServerAuthorized: () => true,
            reloadEvents: async () => createResult([]),
            imageUpload: () => gate,
            eventUpsert: async (input) => {
              savedInputs.push({ imageUrl: input.imageUrl, eventKey: input.eventKey })
              return createResult({ eventKey: input.eventKey, catalogVersion: 1 })
            },
          })
          let savedKey: string | undefined
          const form = adminEventDetailsFormStateCreate({
            catalog,
            onSaved: (eventKey) => {
              savedKey = eventKey
            },
          })
          catalog.eventFieldChange("eventKey", "test-event")
          catalog.eventFieldChange("title", "Test Event")
          const uploadTask = form.imageUpload(new File(["image"], "event.png", { type: "image/png" }))
          expect(form.imageUploading()).toBe(true)
          const submitPromise = form.submit({ preventDefault() {} } as SubmitEvent)
          expect(form.pendingAction()).toBe("save")
          expect(savedInputs.length).toBe(0)
          resolveUpload(createResult(variants))
          await uploadTask
          await submitPromise
          expect(form.imageUploading()).toBe(false)
          expect(form.pendingAction()).toBeNull()
          expect(catalog.eventDraft().imageUrl).toBe(variants.detail)
          expect(savedInputs.length).toBe(1)
          expect(savedInputs[0]!.imageUrl).toBe(variants.detail)
          expect(savedKey).toBe("test-event")
        } finally {
          dispose()
        }
      })
    })

    test("preserves upload on new event when eventKey changes during upload", async () => {
      await createRoot(async (dispose) => {
        try {
          let resolveUpload!: (value: { readonly success: true; readonly data: typeof variants }) => void
          const gate = new Promise<{ readonly success: true; readonly data: typeof variants }>((resolve) => {
            resolveUpload = resolve
          })
          const catalog = adminCatalogPageStateCreate({
            events: () => [],
            isServerAuthorized: () => true,
            reloadEvents: async () => createResult([]),
            imageUpload: () => gate,
          })
          const form = adminEventDetailsFormStateCreate({ catalog })
          expect(catalog.eventDraft().eventKey).toBe("")
          const uploadTask = form.imageUpload(new File(["image"], "event.png", { type: "image/png" }))
          expect(form.imageUploading()).toBe(true)
          catalog.eventFieldChange("eventKey", "new-event-key")
          catalog.eventFieldChange("title", "New Event")
          resolveUpload(createResult(variants))
          await uploadTask
          expect(form.imageUploading()).toBe(false)
          expect(catalog.eventDraft().imageUrl).toBe(variants.detail)
          expect(catalog.eventDraft().imageVariants).toEqual(variants)
          expect(form.imagePreview()!.src).toBe(variants.detail)
        } finally {
          dispose()
        }
      })
    })
  })
}
