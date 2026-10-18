import { Icon } from "#ui/static/icon/Icon.jsx"
import { classMerge } from "#ui/utils/classMerge.js"
import { dashSocialNetworksCreate, type DashSocialNetwork } from "./dashSocialNetworks.ts"

const dashSocialIconByNetwork = new Map<DashSocialNetwork, string>(
  dashSocialNetworksCreate().map((network) => [network.id, network.icon] as const),
)

export interface DashSocialIconProps {
  network: DashSocialNetwork
  class?: string
}

/** Marken-Icon eines Social-Netzwerks (MDI-Pfade bzw. eigene SVG-Pfade für TikTok und X). */
export function DashSocialIcon(p: DashSocialIconProps) {
  return <Icon path={dashSocialIconByNetwork.get(p.network) ?? ""} class={classMerge("size-4", p.class)} />
}
