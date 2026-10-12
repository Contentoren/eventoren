import { expect, test } from "bun:test"
import { adminTicketOrdersColumnWidthsDragCreate } from "./adminTicketOrdersColumnWidthsDragCreate.ts"

type Listener = (event: { readonly clientX: number }) => void

function dragTarget() {
  const listeners = new Map<string, Set<Listener>>()
  return {
    addEventListener: (type: string, listener: Listener) => {
      const set = listeners.get(type) ?? new Set<Listener>()
      set.add(listener)
      listeners.set(type, set)
    },
    removeEventListener: (type: string, listener: Listener) => {
      listeners.get(type)?.delete(listener)
    },
    emit: (type: string, clientX: number) => {
      for (const listener of listeners.get(type) ?? []) listener({ clientX })
    },
    count: (type: string) => listeners.get(type)?.size ?? 0,
  }
}

test("pointer drag reports deltas from the start position", () => {
  const target = dragTarget()
  const deltas: number[] = []
  const drag = adminTicketOrdersColumnWidthsDragCreate({ startX: 100, onDelta: (delta) => deltas.push(delta), target })
  expect(drag).not.toBeNull()

  target.emit("pointermove", 130)
  target.emit("pointermove", 80)

  expect(deltas).toEqual([30, -20])
  drag?.cancel()
})

test("pointer release ends the drag and removes all listeners", () => {
  const target = dragTarget()
  let done = 0
  const drag = adminTicketOrdersColumnWidthsDragCreate({
    startX: 100,
    onDelta: () => {},
    onDone: () => {
      done += 1
    },
    target,
  })
  expect(drag).not.toBeNull()

  target.emit("pointerup", 150)

  expect(done).toBe(1)
  expect(target.count("pointermove")).toBe(0)
  expect(target.count("pointerup")).toBe(0)
  expect(target.count("pointercancel")).toBe(0)
})

test("manual cancel removes all listeners without finishing", () => {
  const target = dragTarget()
  let done = 0
  const drag = adminTicketOrdersColumnWidthsDragCreate({
    startX: 100,
    onDelta: () => {},
    onDone: () => {
      done += 1
    },
    target,
  })

  drag?.cancel()

  expect(done).toBe(0)
  expect(target.count("pointermove")).toBe(0)
  expect(target.count("pointerup")).toBe(0)
  expect(target.count("pointercancel")).toBe(0)
})

test("drag creation without a browser target returns null", () => {
  expect(typeof window).toBe("undefined")
  expect(adminTicketOrdersColumnWidthsDragCreate({ startX: 0, onDelta: () => {} })).toBeNull()
})
