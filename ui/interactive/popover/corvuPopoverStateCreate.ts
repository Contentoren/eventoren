import { type Accessor, children, type JSX } from "solid-js"

export function corvuPopoverStateCreate(p: { buttonChildren: Accessor<JSX.Element> }) {
  const buttonChildren = children(() => p.buttonChildren())

  return { buttonChildren }
}
