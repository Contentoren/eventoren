import { mdiCalendarSearch } from "@adaptive-ds/mdi/mdiCalendarSearch.js"
import { mdiEmail } from "@adaptive-ds/mdi/mdiEmail.js"
import { mdiInformationOutline } from "@adaptive-ds/mdi/mdiInformationOutline.js"
import { mdiStorefrontOutline } from "@adaptive-ds/mdi/mdiStorefrontOutline.js"
import { mdiWeb } from "@adaptive-ds/mdi/mdiWeb.js"
import { For, Show } from "solid-js"
import { TabNav } from "#ui/interactive/tabs/TabNav.jsx"
import { Details } from "#ui/interactive/details/Details.jsx"
import { LinkButtonExternal, LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { UiContainer } from "#src/ui/UiContainer.tsx"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { DashMarkdown } from "../../ui/markdown/DashMarkdown.tsx"
import { DashOrgLogo } from "../../ui/org/DashOrgLogo.tsx"
import { DashSocialLinks } from "../../ui/social/DashSocialLinks.tsx"
import { DashProfileEventCard } from "./DashProfileEventCard.tsx"
import type { DashProfilePageState } from "./dashProfilePageStateCreate.ts"

export interface DashProfilePageProps {
  state: DashProfilePageState
}

/** Öffentliches Veranstalterprofil: Hero-Band, Beschreibung, Event-Tabs und Anbieterangaben. */
export function DashProfilePage(p: DashProfilePageProps) {
  return (
    <UiContainer width="wide" class="flex flex-col gap-6 py-6 sm:py-8">
      <Show
        when={p.state.org()}
        fallback={
          <EmptyState
            icon={mdiStorefrontOutline}
            title="Veranstalter nicht gefunden"
            description="Dieses Profil gibt es nicht oder es ist nicht mehr öffentlich."
            actions={
              <LinkButtonInternal to="/demo/customer/events" variant="contrast" class="h-9 px-3 text-sm">
                Events entdecken
              </LinkButtonInternal>
            }
          />
        }
      >
        {(org) => (
          <>
            <section
              aria-label={org().name}
              class="overflow-hidden rounded-card border border-border-subtle bg-surface"
            >
              <div aria-hidden="true" class="h-[120px] bg-linear-to-r from-brand-soft to-surface" />
              <div class="px-4 pb-5 sm:px-6">
                <div class="-mt-12 mb-3">
                  <DashOrgLogo
                    name={org().name}
                    logoDataUrl={org().logoDataUrl}
                    size="xl"
                    shape="circle"
                    class="size-24 text-3xl ring-4 ring-surface"
                  />
                </div>
                <h1 class="text-2xl font-semibold tracking-tight text-content sm:text-3xl">{org().name}</h1>
                <Show when={org().subtitle.trim() !== ""}>
                  <p class="mt-1 text-sm text-content-muted sm:text-base">{org().subtitle}</p>
                </Show>
                <div class="mt-4 flex flex-wrap items-center gap-2">
                  <DashSocialLinks socials={org().socials} website={org().website} name={org().name} size="md" />
                  <Show when={org().website.trim() !== ""}>
                    <LinkButtonExternal
                      href={org().website}
                      newTab
                      variant="outline"
                      icon={mdiWeb}
                      class="h-9 px-3 text-sm"
                    >
                      Website
                    </LinkButtonExternal>
                  </Show>
                  <Show when={p.state.contactHref()}>
                    {(href) => (
                      <LinkButtonExternal href={href()} variant="outline" icon={mdiEmail} class="h-9 px-3 text-sm">
                        Kontakt
                      </LinkButtonExternal>
                    )}
                  </Show>
                </div>
              </div>
            </section>

            <Show when={org().description.trim() !== ""}>
              <div class="max-w-3xl">
                <DashMarkdown text={org().description} />
              </div>
            </Show>

            <section aria-label="Events">
              <TabNav
                items={[
                  { id: "kommende", label: "Kommende", count: p.state.upcoming().length },
                  { id: "vergangene", label: "Vergangene", count: p.state.past().length },
                ]}
                active={p.state.tab()}
                onSelect={(id) => p.state.onTab(id === "vergangene" ? "vergangene" : "kommende")}
                ariaLabel="Events filtern"
              />
              <Show
                when={p.state.visible().length > 0}
                fallback={
                  <Show
                    when={p.state.tab() === "kommende"}
                    fallback={
                      <EmptyState
                        icon={mdiCalendarSearch}
                        title="Keine vergangenen Events"
                        description="Hier erscheinen beendete Events dieses Veranstalters."
                      />
                    }
                  >
                    <EmptyState
                      icon={mdiCalendarSearch}
                      title="Gerade keine kommenden Events"
                      description="Schau bald wieder vorbei – oder stöbere in den vergangenen Events."
                      actions={
                        <LinkButtonInternal
                          to="/demo/customer/veranstalter/$orgSlug"
                          params={{ orgSlug: org().slug }}
                          search={{ tab: "vergangene" }}
                          variant="outline"
                          class="h-9 px-3 text-sm"
                        >
                          Vergangene ansehen
                        </LinkButtonInternal>
                      }
                    />
                  </Show>
                }
              >
                <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <For each={p.state.visible()}>
                    {(event) => (
                      <DashProfileEventCard
                        orgSlug={org().slug}
                        event={event}
                        priceLabel={p.state.priceLabel(event.id)}
                      />
                    )}
                  </For>
                </div>
              </Show>
            </section>

            <Show when={p.state.imprintRows().length > 0}>
              <Details
                title="Anbieterangaben"
                icon={mdiInformationOutline}
                class="border border-border-subtle bg-surface"
                summaryClass="flex-row p-4 text-content sm:p-5"
              >
                <dl class="grid gap-3 px-4 pb-4 text-sm sm:grid-cols-2 sm:px-5 sm:pb-5">
                  <For each={p.state.imprintRows()}>
                    {(row) => (
                      <div>
                        <dt class="text-xs font-medium uppercase tracking-wide text-content-muted">{row.label}</dt>
                        <dd class="mt-0.5 text-content">
                          {row.value}
                          <Show when={row.label === "Anbieter" && org().email.trim() !== ""}>
                            <span class="mt-1 block">
                              <a
                                href={`mailto:${org().email.trim()}`}
                                class="text-brand underline-offset-2 hover:underline"
                              >
                                {org().email.trim()}
                              </a>
                            </span>
                          </Show>
                        </dd>
                      </div>
                    )}
                  </For>
                </dl>
              </Details>
            </Show>
          </>
        )}
      </Show>
    </UiContainer>
  )
}
