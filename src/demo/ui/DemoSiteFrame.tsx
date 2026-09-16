import type { JSX } from "solid-js"
import type { UserRole } from "../../auth/model_field/userRole.ts"

export function DemoSiteFrame(props: {
  readonly currentId: string
  readonly children: JSX.Element
  readonly sessionRole?: UserRole
  readonly cartQuantity?: () => number
}) {
  return props.children
}
