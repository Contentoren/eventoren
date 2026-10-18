import { mdiOpenInNew } from "@adaptive-ds/mdi/mdiOpenInNew.js"
import { Show } from "solid-js"

import { Input } from "#ui/input/input/Input.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import type { DashSocialNetwork } from "../../../ui/social/dashSocialNetworks.ts"
import { dashSocialNetworksCreate, type DashSocialNetworkMeta } from "../../../ui/social/dashSocialNetworks.ts"
import { dashSocialUrl } from "../../../ui/social/dashSocialUrl.ts"
import { DashSocialIcon } from "../../../ui/social/DashSocialIcon.tsx"
import type { DashProfilePageState } from "../dashProfilePageStateCreate.ts"

const dashProfileSocialMetaById = new Map(dashSocialNetworksCreate().map((entry) => [entry.id, entry]))

const dashProfileSocialPlaceholder: Record<DashSocialNetwork, string> = {
  instagram: "kulturhaus.lindenhof",
  facebook: "kulturhaus.lindenhof",
  tiktok: "kulturhaus.lindenhof",
  youtube: "kulturhaus.lindenhof",
  x: "kulturhaus.lindenhof",
  linkedin: "kulturhaus-lindenhof",
}

/** Einzelne Social-Media-Zeile: Marken-Icon, Eingabe mit Präfix-Addon und Icon-Link. */
export function DashProfileSocialField(p: {
  state: DashProfilePageState
  disabled: boolean
  network: DashSocialNetworkMeta
  error?: string
}) {
  const meta = () => dashProfileSocialMetaById.get(p.network.id) ?? p.network
  const current = () => p.state.form.get()?.socials[p.network.id] ?? ""
  const href = () => dashSocialUrl(p.network.id, current())
  return (
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center gap-3">
        <span class="flex size-10 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-muted text-content-muted">
          <DashSocialIcon network={p.network.id} class="size-5" />
        </span>
        <div class="min-w-0 flex-1">
          <label for={`dash-profile-social-${p.network.id}`} class="mb-1 block text-sm font-medium text-content">
            {meta().label}
          </label>
          <div class="relative">
            <span
              aria-hidden="true"
              class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-content-muted"
            >
              {meta().prefix}
            </span>
            <span class="sr-only">{meta().prefix}</span>
            <Input
              id={`dash-profile-social-${p.network.id}`}
              value={current()}
              placeholder={dashProfileSocialPlaceholder[p.network.id]}
              maxlength={200}
              disabled={p.disabled}
              aria-invalid={p.error ? "true" : undefined}
              onInput={(event) => p.state.setSocial(p.network.id, event.currentTarget.value)}
              class={href() ? "pr-10 pl-2" : "pr-3 pl-2"}
              style={{ "text-indent": `${meta().prefix.length * 0.52 + 0.75}rem` }}
            />
            <Show when={href()}>
              {(url) => (
                <a
                  href={url()}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Profil öffnen"
                  title="Profil öffnen"
                  class="absolute inset-y-0 right-3 flex items-center text-content-muted hover:text-content focus-visible:text-content focus-visible:outline-none"
                >
                  <Icon path={mdiOpenInNew} class="size-4" />
                </a>
              )}
            </Show>
          </div>
        </div>
      </div>
      <Show when={p.error}>
        {(message) => (
          <p role="alert" class="pl-[3.25rem] text-xs text-danger dark:text-red-300">
            {message()}
          </p>
        )}
      </Show>
    </div>
  )
}
