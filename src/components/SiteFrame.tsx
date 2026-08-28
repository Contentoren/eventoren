import type { JSX } from "solid-js"
import { SiteFooter } from "./SiteFooter"
import { SiteHeader } from "./SiteHeader"

export function SiteFrame(props: { children: JSX.Element }) {
  return (
    <div class="min-h-screen bg-surface-base text-content">
      <SiteHeader />
      {props.children}
      <SiteFooter />
    </div>
  )
}
