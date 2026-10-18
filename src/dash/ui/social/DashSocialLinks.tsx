import { For, Show } from "solid-js"
import { mdiWeb } from "@adaptive-ds/mdi/mdiWeb.js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { classMerge } from "#ui/utils/classMerge.js"
import type { DashSocials } from "#src/dash/model/dashSocialsSchema.ts"
import type { DashSocialNetwork } from "./dashSocialNetworks.ts"
import { dashSocialNetworksCreate } from "./dashSocialNetworks.ts"
import { dashSocialUrl } from "./dashSocialUrl.ts"
import { DashSocialIcon } from "./DashSocialIcon.tsx"
import { dashSocialLinksStateCreate } from "./dashSocialLinksStateCreate.ts"

export interface DashSocialLinksProps {
  socials: DashSocials
  website?: string
  name?: string
  size?: "sm" | "md"
  variant?: "icon" | "chip"
  class?: string
}

/** Runde Social-Icon-Buttons (neuer Tab) nur für befüllte Netzwerke, optional mit Website-Chip. */
export function DashSocialLinks(p: DashSocialLinksProps) {
  const state = dashSocialLinksStateCreate({ socials: () => p.socials, website: () => p.website })

  return (
    <div class={classMerge("flex flex-wrap items-center gap-2", p.class)}>
      <For each={state.entries()}>
        {(entry) => (
          <DashSocialEntryLink
            network={entry.network}
            label={entry.label}
            href={entry.href}
            name={p.name}
            size={p.size ?? "md"}
            variant={p.variant ?? "icon"}
          />
        )}
      </For>
      <Show when={state.websiteHref()}>
        {(href) => (
          <a
            href={href()}
            target="_blank"
            rel="noopener noreferrer"
            class={classMerge(
              "inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface text-content-muted transition-colors",
              "hover:border-border-strong/40 hover:text-content",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              (p.variant ?? "icon") === "chip"
                ? p.size === "sm"
                  ? "h-7 px-2.5 text-xs"
                  : "h-9 px-3 text-sm"
                : p.size === "sm"
                  ? "size-8"
                  : "size-10",
              (p.variant ?? "icon") === "icon" && "justify-center",
            )}
            aria-label={p.name ? `Website von ${p.name}` : "Website"}
            title={p.name ? `Website von ${p.name}` : "Website"}
          >
            <Icon path={mdiWeb} class={p.size === "sm" ? "size-4" : "size-5"} />
            <Show when={(p.variant ?? "icon") === "chip"}>
              <span>Website</span>
            </Show>
          </a>
        )}
      </Show>
    </div>
  )
}

export { dashSocialUrl, dashSocialNetworksCreate }

function DashSocialEntryLink(p: {
  network: DashSocialNetwork
  label: string
  href: string | null
  name?: string
  size: "sm" | "md"
  variant: "icon" | "chip"
}) {
  return (
    <Show when={p.href}>
      {(href) => (
        <Show
          when={p.variant === "chip"}
          fallback={
            <a
              href={href()}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${p.label} von ${p.name ?? "diesem Veranstalter"}`}
              title={`${p.label} von ${p.name ?? "diesem Veranstalter"}`}
              class={classMerge(
                "inline-flex items-center justify-center rounded-full border border-border-subtle bg-surface text-content-muted transition-colors",
                "hover:border-border-strong/40 hover:text-content",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                p.size === "sm" ? "size-8" : "size-10",
              )}
            >
              <DashSocialIcon network={p.network} class={p.size === "sm" ? "size-4" : "size-5"} />
            </a>
          }
        >
          <a
            href={href()}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${p.label} von ${p.name ?? "diesem Veranstalter"}`}
            title={`${p.label} von ${p.name ?? "diesem Veranstalter"}`}
            class={classMerge(
              "inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface text-content-muted transition-colors",
              "hover:border-border-strong/40 hover:text-content",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              p.size === "sm" ? "h-7 px-2.5 text-xs" : "h-9 px-3 text-sm",
            )}
          >
            <DashSocialIcon network={p.network} class="size-4" />
            {p.label}
          </a>
        </Show>
      )}
    </Show>
  )
}
