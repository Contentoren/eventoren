import { For } from "solid-js"
import { mdiCashRegister } from "@adaptive-ds/mdi/mdiCashRegister.js"
import { mdiCurrencyEur } from "@adaptive-ds/mdi/mdiCurrencyEur.js"
import { mdiReceiptTextOutline } from "@adaptive-ds/mdi/mdiReceiptTextOutline.js"
import { mdiTicketOutline } from "@adaptive-ds/mdi/mdiTicketOutline.js"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { StatCard } from "#ui/static/stat/StatCard.jsx"
import { UiContainer } from "../../ui/UiContainer.tsx"
import { DemoScenarioFrame } from "../../demo/ui/DemoScenarioFrame.tsx"
import { AreaChart } from "#ui/chart/AreaChart.jsx"
import { BarChart } from "#ui/chart/BarChart.jsx"
import { DonutChart } from "#ui/chart/DonutChart.jsx"
import { Sparkline } from "#ui/chart/Sparkline.jsx"
import type { uiKitDiagrammeGalleryStateCreate } from "./uiKitDiagrammeGalleryStateCreate.ts"

/** Gallery for the chart kit: area, sparklines, bars, donut, and empty states. */
export function UiKitDiagrammeGallery(props: { state: ReturnType<typeof uiKitDiagrammeGalleryStateCreate> }) {
  const state = props.state

  const points30 = () => state.revenue30.map((entry) => ({ label: entry.label, value: entry.value }))
  const compare30 = () => state.revenue30.map((entry) => entry.compare)

  return (
    <DemoScenarioFrame currentId="ui-kit-diagramme">
      <UiContainer width="wide" class="flex flex-col gap-6 py-10">
        <header class="flex flex-col gap-1">
          <h1 class="text-xl font-semibold tracking-tight text-content sm:text-2xl">Diagramme-UI-Kit</h1>
          <p class="text-sm text-content-muted">Flächen, Sparklines, Balken und Donut zum Ausprobieren.</p>
        </header>

        <CardWrapper class="border-border-subtle">
          <h2 class="text-sm font-semibold text-content">Umsatz · 30 Tage</h2>
          <p class="mt-1 text-xs text-content-muted">
            Vorzeitraum gestrichelt, Phasenwechsel als Marker, Tooltip mit Zeigefinger oder Tastatur.
          </p>
          <div class="mt-3">
            <AreaChart
              points={points30()}
              compare={compare30()}
              markers={[
                { index: 9, label: "Phase 1" },
                { index: 21, label: "Phase 2" },
              ]}
              valueFormat={state.euroFormat}
              axisFormat={state.axisFormat}
              ariaLabel="Umsatz der letzten 30 Tage mit Vorzeitraum"
            />
          </div>
        </CardWrapper>

        <CardWrapper class="border-border-subtle">
          <h2 class="text-sm font-semibold text-content">Umsatz · 7 Tage</h2>
          <p class="mt-1 text-xs text-content-muted">Kompakte Woche ohne Vergleichsserie.</p>
          <div class="mt-3">
            <AreaChart
              points={state.revenue7}
              height={180}
              valueFormat={state.euroFormat}
              axisFormat={state.axisFormat}
              ariaLabel="Umsatz der letzten 7 Tage"
            />
          </div>
        </CardWrapper>

        <CardWrapper class="border-border-subtle">
          <h2 class="text-sm font-semibold text-content">Leeres Flächendiagramm</h2>
          <p class="mt-1 text-xs text-content-muted">Gleiche Höhe, ruhiger Platzhalter statt Achsen.</p>
          <div class="mt-3">
            <AreaChart points={[]} valueFormat={state.euroFormat} ariaLabel="Keine Umsatzdaten" />
          </div>
        </CardWrapper>

        <CardWrapper class="border-border-subtle">
          <h2 class="text-sm font-semibold text-content">Kennzahlen mit Sparklines</h2>
          <p class="mt-1 text-xs text-content-muted">Vier Töne in kleinen Statistikkarten.</p>
          <div class="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Umsatz"
              value={state.euroFormat(48_210_00)}
              icon={mdiCurrencyEur}
              delta={{ value: 12.4, label: "ggü. Vorzeitraum" }}
              footer={<Sparkline values={state.sparkRevenue} tone="brand" ariaLabel="Umsatzverlauf" />}
            />
            <StatCard
              label="Tickets"
              value="1 284"
              icon={mdiTicketOutline}
              delta={{ value: 8.1, label: "ggü. Vorzeitraum" }}
              footer={<Sparkline values={state.sparkTickets} tone="success" ariaLabel="Ticketverlauf" />}
            />
            <StatCard
              label="Bestellungen"
              value="642"
              icon={mdiReceiptTextOutline}
              delta={{ value: -2.3, label: "ggü. Vorzeitraum" }}
              footer={<Sparkline values={state.sparkOrders} tone="neutral" ariaLabel="Bestellverlauf" />}
            />
            <StatCard
              label="Ø Bestellwert"
              value={state.euroFormat(7_512)}
              icon={mdiCashRegister}
              delta={{ value: 0, label: "ggü. Vorzeitraum" }}
              footer={<Sparkline values={state.sparkAverage} tone="danger" ariaLabel="Bestellwertverlauf" />}
            />
          </div>
        </CardWrapper>

        <CardWrapper class="border-border-subtle">
          <h2 class="text-sm font-semibold text-content">Check-ins · 19:00–22:45</h2>
          <p class="mt-1 text-xs text-content-muted">
            16 Viertelstunden-Balken, der letzte ist hervorgehoben und zeigt den Tooltip.
          </p>
          <div class="mt-3">
            <BarChart bars={state.checkins} valueFormat={state.countFormat} ariaLabel="Check-ins je Viertelstunde" />
          </div>
        </CardWrapper>

        <CardWrapper class="border-border-subtle">
          <h2 class="text-sm font-semibold text-content">Leeres Balkendiagramm</h2>
          <p class="mt-1 text-xs text-content-muted">Gleiche Höhe, ruhiger Platzhalter statt Balken.</p>
          <div class="mt-3">
            <BarChart bars={[]} valueFormat={state.countFormat} ariaLabel="Keine Check-in-Daten" />
          </div>
        </CardWrapper>

        <CardWrapper class="border-border-subtle">
          <h2 class="text-sm font-semibold text-content">Verkaufskanäle</h2>
          <p class="mt-1 text-xs text-content-muted">Online, Abendkasse und Gästeliste mit Mitte „431 Tickets“.</p>
          <div class="mt-3 flex justify-center">
            <DonutChart
              segments={state.donut}
              center="431 Tickets"
              valueFormat={state.countFormat}
              ariaLabel="Tickets je Verkaufskanal"
            />
          </div>
        </CardWrapper>

        <CardWrapper class="border-border-subtle">
          <h2 class="text-sm font-semibold text-content">Leerer Donut</h2>
          <p class="mt-1 text-xs text-content-muted">Grauer Ring als Platzhalter ohne Segmente.</p>
          <div class="mt-3 flex justify-center">
            <DonutChart segments={[]} valueFormat={state.countFormat} ariaLabel="Keine Kanaldaten" />
          </div>
        </CardWrapper>

        <CardWrapper class="border-border-subtle">
          <h2 class="text-sm font-semibold text-content">Alle Sparklines</h2>
          <p class="mt-1 text-xs text-content-muted">Fläche an, aus und ohne Töne im Vergleich.</p>
          <div class="mt-3 flex flex-wrap items-end gap-6">
            <For each={["brand", "success", "danger", "neutral"] as const}>
              {(tone) => (
                <div class="flex flex-col gap-1">
                  <Sparkline values={state.sparkRevenue} tone={tone} ariaLabel={`Verlauf ${tone}`} />
                  <span class="text-xs text-content-muted">{tone}</span>
                </div>
              )}
            </For>
          </div>
        </CardWrapper>
      </UiContainer>
    </DemoScenarioFrame>
  )
}
