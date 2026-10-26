import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { contactPageStateCreate } from "../src/contact/contactPageStateCreate.ts"

test("contact form state exposes signal objects and reset restores its fields", () => {
  createRoot((dispose) => {
    const state = contactPageStateCreate({ initialSubmitted: true })

    expect(state.isSubmitted.get()).toBe(true)
    expect(state.name.get()).toBe("")

    state.name.set("Ada Lovelace")
    state.email.set("ada@example.com")
    state.message.set("A question")
    state.resetForm()

    expect(state.name.get()).toBe("")
    expect(state.email.get()).toBe("")
    expect(state.message.get()).toBe("")
    expect(state.isSubmitted.get()).toBe(false)
    dispose()
  })
})

test("submitting the form never claims a received message", async () => {
  await createRoot(async (dispose) => {
    const state = contactPageStateCreate()
    let prevented = false

    state.submitForm({ preventDefault: () => (prevented = true) } as unknown as SubmitEvent)

    // The submit only stops the browser navigation, there is no delivery to report.
    expect(prevented).toBe(true)
    expect(state.isSubmitting.get()).toBe(false)
    expect(state.isSubmitted.get()).toBe(false)

    // The former delayed success (600ms) must not come back.
    await new Promise((resolve) => setTimeout(resolve, 700))
    expect(state.isSubmitted.get()).toBe(false)
    expect(state.isSubmitting.get()).toBe(false)

    dispose()
  })
})

test("contact FAQ toggle opens and closes the selected question", () => {
  createRoot((dispose) => {
    const state = contactPageStateCreate()

    expect(state.expandedFaqId.get()).toBe("faq-1")
    state.toggleFaq("faq-2")
    expect(state.expandedFaqId.get()).toBe("faq-2")
    state.toggleFaq("faq-2")
    expect(state.expandedFaqId.get()).toBeNull()
    dispose()
  })
})
