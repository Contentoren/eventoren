import { Avatar, type AvatarShape, type AvatarSize } from "#ui/static/avatar/Avatar.jsx"

export interface DashOrgLogoProps {
  name: string
  logoDataUrl: string | null
  size?: AvatarSize
  shape?: AvatarShape
  class?: string
}

/** Organisations-Logo: hochgeladenes Bild oder Initialen-Avatar als Fallback. */
export function DashOrgLogo(p: DashOrgLogoProps) {
  return <Avatar name={p.name} src={p.logoDataUrl} size={p.size ?? "md"} shape={p.shape ?? "rounded"} class={p.class} />
}
