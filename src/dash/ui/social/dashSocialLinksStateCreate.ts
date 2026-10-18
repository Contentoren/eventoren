import type { DashSocials } from "#src/dash/model/dashSocialsSchema.ts"
import { dashSocialNetworksCreate } from "./dashSocialNetworks.ts"
import { dashSocialUrl } from "./dashSocialUrl.ts"

import type { DashSocialNetwork } from "./dashSocialNetworks.ts"

export interface DashSocialLinkEntry {
  network: DashSocialNetwork
  label: string
  href: string | null
}

export function dashSocialLinksStateCreate(inputs: { socials: () => DashSocials; website: () => string | undefined }) {
  const networks = dashSocialNetworksCreate()

  const entriesList = () =>
    networks.map((network) => ({
      network: network.id,
      label: network.label,
      href: dashSocialUrl(network.id, inputs.socials()[network.id] ?? ""),
    }))

  const websiteHref = () => {
    const website = inputs.website()?.trim()
    if (!website) return null
    if (/^https?:\/\//i.test(website)) return website
    return `https://${website}`
  }

  return { entries: entriesList, websiteHref }
}

export type DashSocialLinksState = ReturnType<typeof dashSocialLinksStateCreate>
