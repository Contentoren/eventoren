import { For, Show } from "solid-js"
import { veranstalterDashboardPublicTimeFormat } from "../veranstalterDashboardPublicFormat.ts"
import { veranstalterDashboardPublicProfileStateCreate } from "../veranstalterDashboardPublicProfileStateCreate.ts"

/** Public organizer profile from live data: logo-free header, contact, imprint and upcoming events. */
export function VeranstalterDashboardPublicProfilePage(p: {
  state: ReturnType<typeof veranstalterDashboardPublicProfileStateCreate>
}) {
  return (
    <Show
      when={(() => {
        const data = p.state.profile()
        return data && "success" in data && data.success ? data.data : undefined
      })()}
      fallback={<p class="text-sm text-content-muted">Veranstalterprofil wird geladen …</p>}
    >
      {(profile) => (
        <section aria-labelledby="veranstalter-profil" class="flex flex-col gap-4">
          <header class="flex flex-col gap-1">
            <h1 id="veranstalter-profil" class="text-xl font-semibold tracking-tight text-content sm:text-2xl">
              {profile().name}
            </h1>
            <Show when={profile().contact.email || profile().contact.phone}>
              <p class="text-sm text-content-muted">
                {[profile().contact.email, profile().contact.phone].filter(Boolean).join(" · ")}
              </p>
            </Show>
          </header>
          <Show when={profile().imprint}>
            {(imprint) => <p class="max-w-2xl text-sm text-content-muted">{imprint()}</p>}
          </Show>
          <h2 class="font-semibold">Kommende Veranstaltungen</h2>
          <ul class="flex flex-col gap-2">
            <For each={profile().events} fallback={<li class="text-sm text-content-muted">Keine kommenden Events.</li>}>
              {(event) => (
                <li class="rounded-card border border-border-subtle bg-surface p-3">
                  <a href={`/veranstalter-p/${profile().slug}/${event.eventKey}`} class="font-medium underline">
                    {event.title}
                  </a>
                  <p class="text-sm text-content-muted">
                    {veranstalterDashboardPublicTimeFormat(event.startsAt)} · {event.venue}, {event.city}
                  </p>
                </li>
              )}
            </For>
          </ul>
          <p class="text-xs text-content-muted">Alle Zeiten in Europe/Berlin.</p>
        </section>
      )}
    </Show>
  )
}
