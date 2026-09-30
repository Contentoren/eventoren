import { type Accessor, children, type JSX } from "solid-js"

export function buttonIconStateCreate(p: { children: Accessor<JSX.Element> }) {
  const resolvedChildren = children(() => p.children())

  return { children: resolvedChildren }
}
