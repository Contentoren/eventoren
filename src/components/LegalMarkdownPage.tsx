import type { ParentComponent } from "solid-js"
import { Dynamic } from "solid-js/web"
import { LegalPage } from "../marketing/LegalPage.tsx"
import { SiteFrame } from "./SiteFrame.tsx"

export function LegalMarkdownPage(props: { html: string; title: string; frame?: ParentComponent; homeHref?: string }) {
  return (
    <Dynamic component={props.frame ?? SiteFrame}>
      <LegalPage html={() => props.html} title={props.title} homeHref={props.homeHref} />
    </Dynamic>
  )
}
