import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Avatar } from "#ui/static/avatar/Avatar.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"
import { Kbd } from "#ui/static/kbd/Kbd.jsx"
import { DotPill, type DotPillTone } from "#ui/static/pill/DotPill.jsx"
import { ProgressBar } from "#ui/static/progress/ProgressBar.jsx"
import { ProgressRing } from "#ui/static/progress/ProgressRing.jsx"
import { Skeleton } from "#ui/static/skeleton/Skeleton.jsx"
import { StatCard } from "#ui/static/stat/StatCard.jsx"
import { UiContainer } from "../../ui/UiContainer.tsx"
import { DemoScenarioFrame } from "../../demo/ui/DemoScenarioFrame.tsx"
import { imageList } from "../../app/assets/imageList.js"
import { urlImage } from "../../app/assets/urlImage.js"
import { uiKitBasisGalleryIcons } from "./uiKitBasisGallerySectionsCreate.ts"
import type { uiKitBasisGalleryStateCreate } from "./uiKitBasisGalleryStateCreate.ts"

export function UiKitBasisGallery(props: { state: ReturnType<typeof uiKitBasisGalleryStateCreate> }) {
  const state = props.state
  const sections = state.sections()

  const avatarSizes = ["xs", "sm", "md", "lg", "xl"] as const
  const progressTones = ["brand", "success", "warning", "danger", "neutral"] as const
  const dotPillTones: readonly DotPillTone[] = ["neutral", "brand", "success", "warning", "danger", "info"]

  return (
    <DemoScenarioFrame currentId="ui-kit-basis">
      <UiContainer width="wide" class="flex flex-col gap-6 py-10">
        <header class="flex flex-col gap-1">
          <h1 class="text-xl font-semibold tracking-tight text-content sm:text-2xl">Basis-UI-Kit</h1>
          <p class="text-sm text-content-muted">Avatare, Fortschritt, Zustände, Kennzahlen und kleine Helfer.</p>
        </header>

        <CardWrapper class="border-border-subtle">
          <h2 class="text-sm font-semibold text-content">Avatar</h2>
          <p class="mt-1 text-xs text-content-muted">Initialen der ersten zwei Wörter, stabile Farbe je Name.</p>
          <div class="mt-3 flex flex-col gap-4">
            <div class="flex flex-wrap items-end gap-3">
              <For each={avatarSizes}>{(size) => <Avatar name="Mara Lindner" size={size} />}</For>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <For each={sections.avatarNames}>{(name) => <Avatar name={name} size="md" />}</For>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <Avatar
                name="Mara Lindner"
                size="md"
                shape="rounded"
                src={urlImage(imageList.i1920x1080_webp_concert_crowd)}
              />
              <Avatar name="Indie Night" size="lg" shape="rounded" />
              <Avatar name="Lea Schneider" size="md" src="/demo/fehlendes-avatar.png" />
            </div>
          </div>
        </CardWrapper>

        <CardWrapper class="border-border-subtle">
          <h2 class="text-sm font-semibold text-content">Fortschrittsbalken</h2>
          <p class="mt-1 text-xs text-content-muted">
            Mit Rolle und Werten für Hilfstechnologien, Überlauf wird begrenzt.
          </p>
          <div class="mt-3 flex flex-col gap-3">
            <For each={sections.progressValues}>
              {(entry) => (
                <div class="flex flex-col gap-1">
                  <p class="text-xs text-content-muted">
                    {entry.label}: {entry.value} / {entry.max}
                  </p>
                  <ProgressBar value={entry.value} max={entry.max} label={entry.label} />
                </div>
              )}
            </For>
            <div class="flex flex-col gap-2">
              <For each={progressTones}>
                {(tone) => <ProgressBar value={62} max={100} tone={tone} size="sm" label={`Ton ${tone}`} />}
              </For>
            </div>
          </div>
        </CardWrapper>

        <CardWrapper class="border-border-subtle">
          <h2 class="text-sm font-semibold text-content">Fortschrittsring (deaktiviert)</h2>
        </CardWrapper>

        <CardWrapper class="border-border-subtle">
          <h2 class="text-sm font-semibold text-content">Leere Zustände</h2>
          <p class="mt-1 text-xs text-content-muted">Icon, ein Satz, ein Button.</p>
          <div class="mt-3 grid gap-4 md:grid-cols-3">
            <For each={sections.emptyStates}>
              {(entry) => (
                <div class="rounded-control border border-border-subtle">
                  <EmptyState
                    icon={entry.icon}
                    title={entry.title}
                    description={entry.description}
                    actions={
                      <Button size="sm" variant="outline">
                        {entry.title.includes("Event") ? "Event erstellen" : "Zurücksetzen"}
                      </Button>
                    }
                  />
                </div>
              )}
            </For>
          </div>
          <div class="mt-4 rounded-control border border-border-subtle">
            <EmptyState icon={uiKitBasisGalleryIcons.lock} title="Nur für Finanzen" size="sm" />
          </div>
        </CardWrapper>

        <CardWrapper class="border-border-subtle">
          <h2 class="text-sm font-semibold text-content">Platzhalter</h2>
          <p class="mt-1 text-xs text-content-muted">Pulsiert beim Laden, bleibt bei reduzierter Bewegung ruhig.</p>
          <div class="mt-3 flex flex-col gap-2">
            <Skeleton class="h-4 w-1/3" />
            <Skeleton class="h-4 w-2/3" />
            <div class="flex gap-3">
              <Skeleton class="size-10 rounded-full" />
              <div class="flex flex-1 flex-col gap-2">
                <Skeleton class="h-3 w-1/4" />
                <Skeleton class="h-3 w-3/4" />
              </div>
            </div>
          </div>
        </CardWrapper>

        <CardWrapper class="border-border-subtle">
          <h2 class="text-sm font-semibold text-content">Tastaturkürzel</h2>
          <p class="mt-1 text-xs text-content-muted">Hinweise im Stil physischer Tasten.</p>
          <div class="mt-3 flex flex-wrap items-center gap-2 text-sm text-content-muted">
            <span>
              Suche mit <Kbd>Strg</Kbd> + <Kbd>K</Kbd>
            </span>
            <span>
              Schließen mit <Kbd>Esc</Kbd>
            </span>
            <span>
              Bestätigen mit <Kbd>↵</Kbd>
            </span>
          </div>
        </CardWrapper>

        <CardWrapper class="border-border-subtle">
          <h2 class="text-sm font-semibold text-content">Status-Pillen</h2>
          <p class="mt-1 text-xs text-content-muted">Abgerundet, sanfter Hintergrund, in Hell und Dunkel lesbar.</p>
          <div class="mt-3 flex flex-col gap-3">
            <div class="flex flex-wrap gap-2">
              <For each={dotPillTones}>
                {(tone) => (
                  <DotPill tone={tone}>
                    {tone === "neutral"
                      ? "Entwurf"
                      : tone === "brand"
                        ? "Im Verkauf"
                        : tone === "success"
                          ? "Bezahlt"
                          : tone === "warning"
                            ? "Offen"
                            : tone === "danger"
                              ? "Storniert"
                              : "Info"}
                  </DotPill>
                )}
              </For>
            </div>
            <div class="flex flex-wrap gap-2">
              <DotPill tone="success" pulse>
                Live-Einlass
              </DotPill>
              <DotPill tone="brand" dot={false} icon={uiKitBasisGalleryIcons.eye}>
                Nicht gelistet
              </DotPill>
              <DotPill tone="warning" size="sm">
                Phase 1 endet bald
              </DotPill>
              <DotPill tone="danger" size="sm" icon={uiKitBasisGalleryIcons.info}>
                Abgesagt
              </DotPill>
            </div>
          </div>
        </CardWrapper>

        <CardWrapper class="border-border-subtle">
          <h2 class="text-sm font-semibold text-content">Kennzahlen</h2>
          <p class="mt-1 text-xs text-content-muted">Große Werte, kleine Labels, Deltas auf Deutsch.</p>
          <div class="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Umsatz"
              value="24.380,00 €"
              icon={uiKitBasisGalleryIcons.currency}
              delta={{ value: 12.5, label: "zum Vorzeitraum" }}
            />
            <StatCard
              label="Verkaufte Tickets"
              value="1.284"
              icon={uiKitBasisGalleryIcons.ticket}
              delta={{ value: -3, label: "zum Vorzeitraum" }}
            />
            <StatCard
              label="Bestellungen"
              value="986"
              icon={uiKitBasisGalleryIcons.cart}
              delta={{ value: 0, label: "zum Vorzeitraum" }}
            />
            <StatCard
              label="Ø Bestellwert"
              value="32,40 €"
              icon={uiKitBasisGalleryIcons.chartLine}
              delta={{ value: 4.2, label: "zum Vorzeitraum" }}
              footer="inkl. Gebühren"
            />
            <StatCard
              label="Offene Zahlungen"
              value="7"
              icon={uiKitBasisGalleryIcons.info}
              delta={{ value: -18.4, label: "zum Vortag" }}
              deltaInverted
            />
            <StatCard label="Auslastung" value="66 %" icon={uiKitBasisGalleryIcons.trendingUp} delta={{ value: 8.1 }} />
          </div>
        </CardWrapper>

        <CardWrapper class="border-border-subtle">
          <h2 class="text-sm font-semibold text-content">Dunkel-Vorschau</h2>
          <p class="mt-1 text-xs text-content-muted">Pillen und Kennzahlen bleiben in beiden Modi lesbar.</p>
          <Show
            when={state.darkPreview.get()}
            fallback={
              <div class="mt-3">
                <Button size="sm" variant="outline" onClick={() => state.darkPreview.set(true)}>
                  Dunkle Vorschau zeigen
                </Button>
              </div>
            }
          >
            <div class="dark mt-3 flex flex-wrap gap-2 rounded-control bg-slate-950 p-4">
              <For each={dotPillTones}>{(tone) => <DotPill tone={tone}>Vorschau</DotPill>}</For>
              <div class="flex w-full flex-wrap gap-2 text-slate-100">
                <span class="inline-flex items-center gap-1.5 text-xs">
                  <Kbd class="border-slate-700 bg-slate-900 text-slate-300">Strg</Kbd> +{" "}
                  <Kbd class="border-slate-700 bg-slate-900 text-slate-300">K</Kbd>
                </span>
                <ProgressBar value={66} max={100} tone="success" label="Dunkle Vorschau" class="bg-slate-800" />
              </div>
              <Button size="sm" variant="outline" onClick={() => state.darkPreview.set(false)}>
                Vorschau schließen
              </Button>
            </div>
          </Show>
        </CardWrapper>

        <CardWrapper class="border-border-subtle">
          <h2 class="text-sm font-semibold text-content">Kurz erklärt</h2>
          <p class="mt-1 text-xs text-content-muted">Ein Satz je Komponente, Symbole für Navigation und Status.</p>
          <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-content-muted">
            <Button size="sm" variant="outline">
              Event erstellen
            </Button>
          </div>
        </CardWrapper>
      </UiContainer>
    </DemoScenarioFrame>
  )
}
