import type { Accessor, JSX } from "solid-js"
import type { UserRole } from "../auth/model_field/userRole.ts"
import type { SiteHeaderNavLink } from "./SiteHeaderNavLink.ts"
import { SiteFooter } from "./SiteFooter.tsx"
import { SiteHeader } from "./SiteHeader.tsx"

export function SiteFrame(props: {
  children: JSX.Element
  header?: {
    readonly session?: { readonly role?: UserRole }
    readonly navLinkHref?: (link: SiteHeaderNavLink) => string
    readonly logoHref?: string
    readonly cartHref?: string
    readonly checkoutHref?: string
    readonly cartQuantity?: Accessor<number>
    readonly navLinkIsActive?: (link: SiteHeaderNavLink, href: string, pathname: string) => boolean
    readonly cartIsActive?: (href: string, pathname: string) => boolean
  }
  footerLinkHref?: (href: string) => string
}) {
  return (
    <div class="flex min-h-dvh flex-col bg-surface-base text-content">
      <SiteHeader {...props.header} />
      <div class="flex flex-1 flex-col">{props.children}</div>
      <SiteFooter linkHref={props.footerLinkHref} />
    </div>
  )
}
