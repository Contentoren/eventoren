import { For, Show } from "solid-js"
import { ClientOnly } from "@tanstack/solid-router"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { eventPriceFormat } from "#src/events/eventPriceFormat.ts"
import { UiContainer } from "#src/ui/UiContainer.tsx"
import { DemoScenarioFrame } from "#src/demo/ui/DemoScenarioFrame.tsx"
import { DashMarkdown } from "#src/dash/ui/markdown/DashMarkdown.tsx"
import { DashMarkdownEditor } from "#src/dash/ui/markdown/DashMarkdownEditor.tsx"
import { dashCentsFormat } from "#src/dash/model/dashCentsFormat.ts"
import { dashDateFormat, type DashDateStyle } from "#src/dash/model/dashDateFormat.ts"
import { dashRelativeTimeFormat } from "#src/dash/model/dashRelativeTimeFormat.ts"
import { DashStatusPill } from "#src/dash/ui/status/DashStatusPill.tsx"
import { DashMoneyInput } from "#src/dash/ui/form/DashMoneyInput.tsx"
import { DashDateTimeInput } from "#src/dash/ui/form/DashDateTimeInput.tsx"
import { DashRelativeTime } from "#src/dash/ui/time/DashRelativeTime.tsx"
import type { uiKitDashGalleryStateCreate } from "./uiKitDashGalleryStateCreate.ts"

const dashDateStyles: DashDateStyle[] = ["kurz", "lang", "datum", "zeit", "wochentag-datum", "monat-jahr"]

function UiKitDashPillRow(props: {
  kind: string
  values: string[]
  kindKey: Parameters<typeof DashStatusPill>[0]["kind"]
}) {
  return (
    <div class="flex flex-col gap-2">
      <p class="text-xs font-medium uppercase tracking-wide text-content-muted">{props.kind}</p>
      <div class="flex flex-wrap gap-2">
        <For each={props.values}>{(value) => <DashStatusPill kind={props.kindKey} value={value} />}</For>
      </div>
    </div>
  )
}

export function UiKitDashGallery(props: { state: ReturnType<typeof uiKitDashGalleryStateCreate> }) {
  const state = props.state
  const sections = state.sections()

  return (
    <DemoScenarioFrame currentId="ui-kit-dash">
      <UiContainer width="wide" class="flex flex-col gap-6 py-10">
        <header class="flex flex-col gap-1">
          <h1 class="text-xl font-semibold tracking-tight text-content sm:text-2xl">Dash-UI-Kit</h1>
          <p class="text-sm text-content-muted">
            Status-Pillen, Markdown, Geld- und Datumseingaben sowie Zeit- und Geldformate.
          </p>
        </header>

        <CardWrapper>
          <h2 class="text-sm font-semibold text-content">Status-Pillen</h2>
          <p class="mt-1 text-xs text-content-muted">
            Zentrale Zuordnung pro Bereich, unbekannte Werte bleiben neutral.
          </p>
          <div class="mt-4 grid gap-5 md:grid-cols-2">
            <For each={sections.pillExamples}>
              {(example) => <UiKitDashPillRow kind={example.kind} kindKey={example.kind} values={example.values} />}
            </For>
            <div class="flex flex-col gap-2">
              <p class="text-xs font-medium uppercase tracking-wide text-content-muted">unbekannt</p>
              <div class="flex flex-wrap gap-2">
                <DashStatusPill kind="order" value="zauberhaft" />
              </div>
            </div>
          </div>
        </CardWrapper>

        <CardWrapper>
          <h2 class="text-sm font-semibold text-content">Markdown</h2>
          <p class="mt-1 text-xs text-content-muted">Absätze, Überschriften, Listen, Fett, Kursiv und Links.</p>
          <div class="mt-4 grid gap-6 lg:grid-cols-2">
            <div class="flex flex-col gap-2">
              <p class="text-xs font-medium uppercase tracking-wide text-content-muted">Vorschau</p>
              <div class="rounded-control border border-border-subtle bg-surface-muted px-3 py-2">
                <DashMarkdown text={sections.markdownSample} size="sm" />
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <p class="text-xs font-medium uppercase tracking-wide text-content-muted">Editor</p>
              <DashMarkdownEditor
                value={state.descriptionSignal.get()}
                onChange={state.descriptionSignal.set}
                label="Beschreibung"
                maxLength={1000}
                rows={8}
              />
            </div>
          </div>
        </CardWrapper>

        <CardWrapper>
          <h2 class="text-sm font-semibold text-content">Geld und Datum</h2>
          <p class="mt-1 text-xs text-content-muted">Eingaben mit Live-Werten in Berliner Zeit und Euro.</p>
          <div class="mt-4 grid gap-6 lg:grid-cols-2">
            <div class="flex flex-col gap-2">
              <label for="ui-kit-dash-money" class="text-sm font-medium text-content">
                Preis
              </label>
              <DashMoneyInput
                id="ui-kit-dash-money"
                valueCents={state.moneyCentsSignal.get()}
                onChange={state.moneyCentsSignal.set}
              />
              <p class="text-xs text-content-muted" aria-live="polite">
                {state.moneyCentsSignal.get() === null
                  ? "Kein Betrag"
                  : `${eventPriceFormat(state.moneyCentsSignal.get() ?? 0)} (${dashCentsFormat(state.moneyCentsSignal.get() ?? 0)})`}
              </p>
            </div>
            <div class="flex flex-col gap-2">
              <label for="ui-kit-dash-start" class="text-sm font-medium text-content">
                Beginn
              </label>
              <DashDateTimeInput
                id="ui-kit-dash-start"
                valueIso={state.eventStartSignal.get()}
                onChange={state.eventStartSignal.set}
              />
              <p class="text-xs text-content-muted" aria-live="polite">
                {state.eventStartSignal.get() === null
                  ? "Kein Datum"
                  : dashDateFormat(state.eventStartSignal.get() ?? "", "lang")}
              </p>
            </div>
          </div>
        </CardWrapper>

        <CardWrapper>
          <h2 class="text-sm font-semibold text-content">Formate</h2>
          <p class="mt-1 text-xs text-content-muted">Alle Datumsstile, relative Zeiten und Geldbeträge.</p>
          <div class="mt-4 hidden overflow-x-auto md:block">
            <table class="w-full min-w-160 text-sm">
              <thead>
                <tr class="text-left text-xs font-medium uppercase tracking-wide text-content-muted">
                  <th class="pb-2 pr-4">Stil</th>
                  <For each={sections.formatterSamples}>
                    {(sample) => <th class="pb-2 pr-4">{dashDateFormat(sample.iso, "datum")}</th>}
                  </For>
                </tr>
              </thead>
              <tbody>
                <For each={dashDateStyles}>
                  {(style) => (
                    <tr class="border-t border-border-subtle">
                      <th scope="row" class="py-2 pr-4 text-left font-medium text-content-muted">
                        {style}
                      </th>
                      <For each={sections.formatterSamples}>
                        {(sample) => (
                          <td class="py-2 pr-4 tabular-nums text-content">{dashDateFormat(sample.iso, style)}</td>
                        )}
                      </For>
                    </tr>
                  )}
                </For>
                <tr class="border-t border-border-subtle">
                  <th scope="row" class="py-2 pr-4 text-left font-medium text-content-muted">
                    relativ
                  </th>
                  <For each={sections.formatterSamples}>
                    {(sample) => (
                      <td class="py-2 pr-4 tabular-nums text-content">
                        <ClientOnly fallback={<span>{dashDateFormat(sample.iso, "datum")}</span>}>
                          <DashRelativeTime iso={sample.iso} />
                        </ClientOnly>
                      </td>
                    )}
                  </For>
                </tr>
                <tr class="border-t border-border-subtle">
                  <th scope="row" class="py-2 pr-4 text-left font-medium text-content-muted">
                    Betrag
                  </th>
                  <For each={sections.formatterSamples}>
                    {(sample) => (
                      <td class="py-2 pr-4 text-right tabular-nums text-content">
                        {dashCentsFormat(sample.cents)} · {dashCentsFormat(sample.cents, { signed: true })} ·{" "}
                        {dashCentsFormat(sample.cents, { compact: true })}
                      </td>
                    )}
                  </For>
                </tr>
              </tbody>
            </table>
            <p class="mt-3 text-xs text-content-muted">
              Relativ: {dashRelativeTimeFormat("2026-11-06T19:15:00.000Z", new Date("2026-11-07T12:00:00.000Z"))} ·
              Anzeige: {eventPriceFormat(2550)}
            </p>
          </div>
          <div class="mt-4 flex flex-col gap-4 md:hidden">
            <For each={sections.formatterSamples}>
              {(sample) => (
                <div class="rounded-control border border-border-subtle p-3">
                  <p class="text-xs font-medium uppercase tracking-wide text-content-muted">
                    {dashDateFormat(sample.iso, "datum")}
                  </p>
                  <dl class="mt-2 flex flex-col gap-1.5 text-sm">
                    <For each={dashDateStyles}>
                      {(style) => (
                        <div class="flex items-baseline justify-between gap-3">
                          <dt class="text-xs text-content-muted">{style}</dt>
                          <dd class="text-right tabular-nums text-content">{dashDateFormat(sample.iso, style)}</dd>
                        </div>
                      )}
                    </For>
                    <div class="flex items-baseline justify-between gap-3">
                      <dt class="text-xs text-content-muted">relativ</dt>
                      <dd class="text-right tabular-nums text-content">
                        <ClientOnly fallback={<span>{dashDateFormat(sample.iso, "datum")}</span>}>
                          <DashRelativeTime iso={sample.iso} />
                        </ClientOnly>
                      </dd>
                    </div>
                    <div class="flex items-baseline justify-between gap-3">
                      <dt class="text-xs text-content-muted">Betrag</dt>
                      <dd class="text-right tabular-nums text-content">
                        {dashCentsFormat(sample.cents)} · {dashCentsFormat(sample.cents, { signed: true })} ·{" "}
                        {dashCentsFormat(sample.cents, { compact: true })}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </For>
          </div>
        </CardWrapper>

        <CardWrapper>
          <h2 class="text-sm font-semibold text-content">Dunkel-Vorschau</h2>
          <p class="mt-1 text-xs text-content-muted">Pillen bleiben in beiden Modi lesbar.</p>
          <Show
            when={state.darkPreviewSignal.get()}
            fallback={
              <div class="mt-3">
                <Button size="sm" variant="outline" onClick={() => state.darkPreviewSignal.set(true)}>
                  Dunkle Vorschau zeigen
                </Button>
              </div>
            }
          >
            <div class="dark mt-3 flex flex-wrap gap-2 rounded-control bg-slate-950 p-4">
              <For each={sections.pillExamples}>
                {(example) => (
                  <For each={example.values.slice(0, 3)}>
                    {(value) => <DashStatusPill kind={example.kind} value={value} />}
                  </For>
                )}
              </For>
            </div>
            <div class="mt-3">
              <Button size="sm" variant="outline" onClick={() => state.darkPreviewSignal.set(false)}>
                Vorschau schließen
              </Button>
            </div>
          </Show>
        </CardWrapper>
      </UiContainer>
    </DemoScenarioFrame>
  )
}
