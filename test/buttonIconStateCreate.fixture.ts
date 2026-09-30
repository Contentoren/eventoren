import { strict as assert } from "node:assert"
import { createRoot, createSignal, type JSX } from "solid-js"
import { buttonIconStateCreate } from "../ui/interactive/button/buttonIconStateCreate.js"

createRoot((dispose) => {
  try {
    const [value, valueSet] = createSignal<string | undefined>("First label")
    let getterReads = 0
    const props = {
      get children(): JSX.Element {
        getterReads += 1
        const label = value()
        if (label === undefined) return undefined

        // A JSX element is opaque to children(); each getter evaluation creates a fresh span.
        return { nodeType: 1, tagName: "SPAN", textContent: label } as HTMLSpanElement
      },
    }
    const state = buttonIconStateCreate({ children: () => props.children })
    const first = state.children()

    assert.strictEqual(state.children(), first)
    assert.strictEqual(state.children(), first)
    assert.equal(getterReads, 1)
    assert.equal((first as HTMLSpanElement).textContent, "First label")
    assert.equal(state.children() && "mr-2", "mr-2")
    assert.equal(state.children() && "ml-2", "ml-2")
    assert.equal(getterReads, 1)

    valueSet("Updated label")
    const updated = state.children()
    assert.notStrictEqual(updated, first)
    assert.strictEqual(state.children(), updated)
    assert.strictEqual(state.children(), updated)
    assert.equal((updated as HTMLSpanElement).textContent, "Updated label")
    assert.equal(getterReads, 2)

    valueSet(undefined)
    assert.equal(state.children(), undefined)
    assert.equal(state.children() && "mr-2", undefined)
    assert.equal(state.children() && "ml-2", undefined)
    assert.equal(getterReads, 3)

    valueSet("Restored label")
    const restored = state.children()
    assert.strictEqual(state.children(), restored)
    assert.equal((restored as HTMLSpanElement).textContent, "Restored label")
    assert.equal(getterReads, 4)
  } finally {
    dispose()
  }
})
