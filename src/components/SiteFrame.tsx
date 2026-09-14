import type { JSX } from "solid-js"
import { SiteFooter } from "./SiteFooter.tsx"
import { SiteHeader } from "./SiteHeader.tsx"

export function SiteFrame(props: { children: JSX.Element }) {
  return (
    <div class="flex min-h-dvh flex-col bg-surface-base text-content">
      <SiteHeader />
      <div class="flex flex-1 flex-col">{props.children}</div>
      <SiteFooter />
    </div>
  )
}
