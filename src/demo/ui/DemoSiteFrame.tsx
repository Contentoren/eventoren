import type { JSX } from "solid-js"
import type { UserRole } from "../../auth/model_field/userRole.ts"
import { SiteFrame } from "../../components/SiteFrame.tsx"
import { demoSiteFrameStateCreate } from "../state/demoSiteFrameStateCreate.ts"
import { DemoControls } from "./DemoControls.tsx"

export function DemoSiteFrame(props: {
  readonly currentId: string
  readonly children: JSX.Element
  readonly sessionRole?: UserRole
  readonly cartQuantity?: () => number
}) {
  const state = demoSiteFrameStateCreate(props)

  return (
    <SiteFrame header={state.header} footerLinkHref={state.footerLinkHref}>
      <DemoControls currentId={props.currentId} />
      {props.children}
    </SiteFrame>
  )
}
