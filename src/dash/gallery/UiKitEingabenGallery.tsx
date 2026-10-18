import { For, Show } from "solid-js"
import { CopyButton } from "#ui/interactive/copy/CopyButton.jsx"
import { FilterChip } from "#ui/interactive/chip/FilterChip.jsx"
import { TabNav } from "#ui/interactive/tabs/TabNav.jsx"
import { SegmentedControl } from "#ui/input/segmented/SegmentedControl.jsx"
import { ToggleSwitch } from "#ui/input/toggle/ToggleSwitch.jsx"
import { Stepper } from "#ui/static/stepper/Stepper.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { UiContainer } from "../../ui/UiContainer.tsx"
import { DemoScenarioFrame } from "../../demo/ui/DemoScenarioFrame.tsx"
import type { uiKitEingabenGalleryStateCreate } from "./uiKitEingabenGalleryStateCreate.ts"

export function UiKitEingabenGallery(props: { state: ReturnType<typeof uiKitEingabenGalleryStateCreate> }) {
  const state = props.state
  const sections = state.sections()

  const filterToggle = (id: string) => {
    const current = state.activeFilters.get()
    state.activeFilters.set(current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id])
  }

  return (
    <DemoScenarioFrame currentId="ui-kit-eingaben">
      <UiContainer width="wide" class="flex flex-col gap-6 py-10">
        <header class="flex flex-col gap-1">
          <h1 class="text-xl font-semibold tracking-tight text-content sm:text-2xl">Eingaben-UI-Kit</h1>
          <p class="text-sm text-content-muted">
            Filter, Kopieren, Segmente, Schalter, Schritte und Tabs zum Ausprobieren.
          </p>
        </header>

        <CardWrapper class="border-border-subtle">
          <h2 class="text-sm font-semibold text-content">Filter-Chips</h2>
          <p class="mt-1 text-xs text-content-muted">Mehrfachauswahl mit Zählern und Warnfarben.</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <For each={sections.filterChips}>
              {(chip) => (
                <FilterChip
                  active={state.activeFilters.get().includes(chip.id)}
                  onClick={() => filterToggle(chip.id)}
                  count={chip.count}
                  icon={chip.icon}
                  tone={"tone" in chip ? chip.tone : undefined}
                >
                  {chip.label}
                </FilterChip>
              )}
            </For>
          </div>
          <Show when={state.activeFilters.get().length > 0}>
            <p class="mt-3 text-xs text-content-muted" aria-live="polite">
              Aktiv: {state.activeFilters.get().join(", ")}
            </p>
          </Show>
        </CardWrapper>

        <CardWrapper class="border-border-subtle">
          <h2 class="text-sm font-semibold text-content">Kopieren-Button</h2>
          <p class="mt-1 text-xs text-content-muted">Link kopieren mit Bestätigung für 1,5 Sekunden.</p>
          <div class="mt-3 flex flex-wrap items-center gap-3">
            <CopyButton value="https://eventoren.de/e/sommernachtskonzert" label="Link kopieren" />
            <CopyButton value="EV-260412" ariaLabel="Bestellnummer kopieren" />
          </div>
        </CardWrapper>

        <CardWrapper class="border-border-subtle">
          <h2 class="text-sm font-semibold text-content">Segment-Steuerung</h2>
          <p class="mt-1 text-xs text-content-muted">Zeitraum und Ansicht mit Pfeiltasten wechseln.</p>
          <div class="mt-3 flex flex-col gap-4">
            <SegmentedControl
              value={state.zeitraumSignal.get()}
              onChange={state.zeitraumSignal.set}
              options={sections.zeitraumOptions}
              ariaLabel="Zeitraum wählen"
            />
            <SegmentedControl
              value={state.ansichtSignal.get()}
              onChange={state.ansichtSignal.set}
              options={sections.ansichtOptions}
              ariaLabel="Ansicht wählen"
              size="sm"
            />
          </div>
        </CardWrapper>

        <CardWrapper class="border-border-subtle">
          <h2 class="text-sm font-semibold text-content">Schalter</h2>
          <p class="mt-1 text-xs text-content-muted">Wirken sofort und melden einen Toast.</p>
          <div class="mt-3 flex flex-col gap-4">
            <ToggleSwitch
              checked={state.abendkasseAktiv.get()}
              onChange={state.abendkasseAktiv.set}
              label="Abendkasse aktiv"
              description="Tickets an der Abendkasse verkaufen"
            />
            <ToggleSwitch
              checked={state.erinnerungAktiv.get()}
              onChange={state.erinnerungAktiv.set}
              label="Erinnerung 24 Stunden vorher"
              description="E-Mail mit Anfahrt und Kalendereintrag"
              size="sm"
            />
            <ToggleSwitch checked={false} onChange={() => {}} label="Deaktiviert" disabled />
          </div>
        </CardWrapper>

        <CardWrapper class="border-border-subtle">
          <h2 class="text-sm font-semibold text-content">Schritte</h2>
          <p class="mt-1 text-xs text-content-muted">
            Nur abgeschlossene Schritte sind klickbar. Mobil wird es zur Fortschrittsanzeige.
          </p>
          <div class="mt-3 flex flex-col gap-4">
            <Stepper
              steps={sections.stepperSteps}
              current={state.stepperSignal.get()}
              orientation={state.stepperOrientationSignal.get()}
              onStepClick={state.stepperSignal.set}
            />
            <SegmentedControl
              value={state.stepperOrientationSignal.get()}
              onChange={(value) => state.stepperOrientationSignal.set(value === "vertical" ? "vertical" : "horizontal")}
              options={[
                { value: "horizontal", label: "Waagerecht" },
                { value: "vertical", label: "Senkrecht" },
              ]}
              ariaLabel="Ausrichtung wählen"
              size="sm"
            />
            <Stepper steps={sections.stepperSteps} current={1} />
          </div>
        </CardWrapper>

        <CardWrapper class="border-border-subtle">
          <h2 class="text-sm font-semibold text-content">Tabs</h2>
          <p class="mt-1 text-xs text-content-muted">Unterstrich-Navigation mit Zählern, scrollbar auf Mobilgeräten.</p>
          <div class="mt-3">
            <TabNav
              items={sections.tabItems}
              active={state.tabSignal.get()}
              onSelect={state.tabSignal.set}
              ariaLabel="Events filtern"
            />
            <p class="mt-3 text-sm text-content-muted" aria-live="polite">
              Aktiver Tab: {state.tabSignal.get()}
            </p>
          </div>
        </CardWrapper>
      </UiContainer>
    </DemoScenarioFrame>
  )
}
