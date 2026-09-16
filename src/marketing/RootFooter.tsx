import { Show } from "solid-js"
import { Footer } from "./Footer.tsx"
import { rootFooterStateCreate } from "./rootFooterStateCreate.ts"

export function RootFooter() {
  const state = rootFooterStateCreate()

  return (
    <Show when={state.shouldRender()}>
      <Footer linkHref={state.linkHref()} />
    </Show>
  )
}
