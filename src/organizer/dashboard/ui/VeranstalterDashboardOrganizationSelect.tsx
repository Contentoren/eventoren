import { mdiChevronRight } from "@adaptive-ds/mdi/mdiChevronRight.js"
import { Link } from "@tanstack/solid-router"
import { For, Show } from "solid-js"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { Avatar } from "#ui/static/avatar/Avatar.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import type { VeranstalterDashboardOrganization } from "../client/veranstalterDashboardOrganizationSchema.ts"
import { veranstalterDashboardOrganizationStatusLabel } from "../client/veranstalterDashboardOrganizationStatusLabel.ts"
import { veranstalterDashboardRoleLabel } from "../client/veranstalterDashboardRoleLabel.ts"
import type { VeranstalterDashboardShellState } from "./veranstalterDashboardShellStateCreate.ts"

/** Organisation selection: one scoped link per organisation via URL search state. */
export function VeranstalterDashboardOrganizationSelect(p: { readonly state: VeranstalterDashboardShellState }) {
  return (
    <section aria-labelledby="veranstalter-org-auswahl" class="flex flex-col gap-4">
      <header class="flex flex-col gap-1">
        <h1 id="veranstalter-org-auswahl" class="text-xl font-semibold tracking-tight text-content sm:text-2xl">
          Organisation wählen
        </h1>
        <p class="text-sm text-content-muted">Wähle die Organisation, deren Live-Dashboard du sehen möchtest.</p>
      </header>
      <Show
        when={p.state.requestedOrgUnknown()}
        fallback={
          <p class="text-sm text-content-muted">{`${p.state.organizations().length} Organisation(en) verfügbar.`}</p>
        }
      >
        <p role="alert" class="text-sm text-content-muted">
          Die angeforderte Organisation wurde nicht gefunden – bitte wähle eine verfügbare Organisation.
        </p>
      </Show>
      <LinkButtonInternal to="/veranstalter-einladungen" variant={buttonVariant.outline}>
        Meine Einladungen
      </LinkButtonInternal>
      <ul class="grid gap-3 sm:grid-cols-2">
        <For each={p.state.organizations()}>
          {(organization) => (
            <li>
              <VeranstalterDashboardOrganizationSelectItem organization={organization} />
            </li>
          )}
        </For>
      </ul>
    </section>
  )
}

function VeranstalterDashboardOrganizationSelectItem(p: { readonly organization: VeranstalterDashboardOrganization }) {
  const role = () => veranstalterDashboardRoleLabel(p.organization.role)
  const status = () => veranstalterDashboardOrganizationStatusLabel(p.organization.status)
  return (
    <Link
      to="/veranstalter"
      search={{ org: p.organization.id }}
      aria-label={`${p.organization.name} auswählen`}
      class="focus-ring flex w-full items-center gap-3 rounded-card border border-border-subtle bg-surface p-4 text-left transition-colors hover:border-brand-accent hover:bg-surface-muted/40"
    >
      <Avatar name={p.organization.name} size="md" shape="rounded" />
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-semibold text-content">{p.organization.name}</span>
        <span class="block truncate text-xs text-content-muted">{`${role().label} · ${status().label}`}</span>
      </span>
      <Icon path={mdiChevronRight} class="size-5 shrink-0 text-content-muted" />
    </Link>
  )
}
