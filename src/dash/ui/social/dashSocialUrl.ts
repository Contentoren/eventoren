import type { DashSocialNetwork } from "./dashSocialNetworks.ts"
import { dashSocialNetworksCreate } from "./dashSocialNetworks.ts"

const networks = dashSocialNetworksCreate()
const networkById = new Map(networks.map((network) => [network.id, network] as const))

/**
 * Löst Nutzername oder URL in eine volle https-URL auf.
 * Gibt null zurück, wenn das Feld leer ist.
 */
export function dashSocialUrl(network: DashSocialNetwork, value: string): string | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  const meta = networkById.get(network)
  if (!meta) return null
  const withoutScheme = trimmed.replace(/^https?:\/\//i, "")
  const host = withoutScheme.split("/")[0]?.toLowerCase() ?? ""
  if (host === meta.host || host.endsWith(`.${meta.host}`)) return `https://${withoutScheme}`
  const handle = handleFromUsername(network, withoutScheme)
  if (handle.length === 0) return null
  return `https://${meta.host}/${handle}`
}

function handleFromUsername(network: DashSocialNetwork, withoutScheme: string): string {
  const withoutAt = withoutScheme.replace(/^@+/, "")
  const segments = withoutAt.split("/").filter((segment) => segment.length > 0)
  const bare = segments.join("/")
  if (network === "tiktok" || network === "youtube") return `@${bare.replace(/^@+/, "")}`
  return bare
}
