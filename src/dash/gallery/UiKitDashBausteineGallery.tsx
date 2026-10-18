import { For } from "solid-js"
import { mdiCashRegister } from "@adaptive-ds/mdi/mdiCashRegister.js"
import { mdiCurrencyEur } from "@adaptive-ds/mdi/mdiCurrencyEur.js"
import { mdiReceiptTextOutline } from "@adaptive-ds/mdi/mdiReceiptTextOutline.js"
import { mdiTicketOutline } from "@adaptive-ds/mdi/mdiTicketOutline.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { SegmentedControl } from "#ui/input/segmented/SegmentedControl.jsx"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { UiContainer } from "#src/ui/UiContainer.tsx"
import { DemoScenarioFrame } from "#src/demo/ui/DemoScenarioFrame.tsx"
import { dashTableExport } from "#src/dash/export/dashTableExport.ts"
import { DashKpiCard } from "#src/dash/ui/kpi/DashKpiCard.tsx"
import { DashLockedState } from "#src/dash/ui/locked/DashLockedState.tsx"
import { DashExportMenu } from "#src/dash/ui/export/DashExportMenu.tsx"
import { DashOrgLogo } from "#src/dash/ui/org/DashOrgLogo.tsx"
import { DashSocialLinks } from "#src/dash/ui/social/DashSocialLinks.tsx"
import { DashSection } from "#src/dash/ui/layout/DashSection.tsx"
import { DashField } from "#src/dash/ui/layout/DashField.tsx"
import { DashDescriptionList } from "#src/dash/ui/layout/DashDescriptionList.tsx"
import { DashMoney } from "#src/dash/ui/money/DashMoney.tsx"
import { uiKitDashBausteineGallerySectionsCreate } from "./uiKitDashBausteineGallerySectionsCreate.ts"
import type { uiKitDashBausteineGalleryStateCreate } from "./uiKitDashBausteineGalleryStateCreate.ts"

const logoSizes = ["xs", "sm", "md", "lg", "xl"] as const

/** Minimaler Inline-Sparkline für die Galerie (reines SVG, keine fremde Komponente). */
function DashBausteineSparkline(p: { values: number[]; label: string }) {
  const max = () => Math.max(...p.values, 1)
  const points = () =>
    p.values
      .map((value, index) => `${(index / Math.max(p.values.length - 1, 1)) * 100},${32 - (value / max()) * 28}`)
      .join(" ")
  return (
    <svg
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      role="img"
      aria-label={p.label}
      class="block h-10 w-full text-brand"
    >
      <polyline
        points={points()}
        fill="none"
        stroke="currentColor"
        stroke-width={1.5}
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  )
}

/** Galerie der Dashboard-Bausteine: KPI-Karten, Sperrzustand, Export, Logo, Social, Sektionen und Geld. */
export function UiKitDashBausteineGallery(props: { state: ReturnType<typeof uiKitDashBausteineGalleryStateCreate> }) {
  const state = props.state
  const sections = state.sections()
  return <UiKitDashBausteineGalleryView state={state} sections={sections} />
}

function UiKitDashBausteineGalleryView(props: {
  state: ReturnType<typeof uiKitDashBausteineGalleryStateCreate>
  sections: ReturnType<typeof uiKitDashBausteineGallerySectionsCreate>
}) {
  const state = props.state
  const sections = props.sections
  const logoSize = () => {
    const value = state.logoSizeSignal.get()
    return value === "xs" || value === "sm" || value === "md" || value === "lg" || value === "xl" ? value : "md"
  }

  return (
    <DemoScenarioFrame currentId="ui-kit-dash-bausteine">
      <UiContainer width="wide" class="flex flex-col gap-6 py-6 sm:py-8">
        <header>
          <h1 class="text-xl font-semibold tracking-tight text-content sm:text-2xl">Dash-Bausteine</h1>
          <p class="mt-1 text-sm text-content-muted">
            KPI-Karten, Sperrzustand, Exportmenü, Logo, Social-Links, Sektionen und Geldbeträge.
          </p>
        </header>

        <DashSection title="KPI-Karten" description="Vier Kennzahlen, eine verlinkt, eine negativ, eine lädt.">
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashKpiCard
              label="Umsatz"
              value="24.380,00 €"
              icon={mdiCurrencyEur}
              delta={12.5}
              href="/demo/dashboard"
              search={{ zeitraum: 30 }}
              chart={<DashBausteineSparkline values={sections.sparkRevenue} label="Umsatzverlauf" />}
            />
            <DashKpiCard
              label="Verkaufte Tickets"
              value="1.284"
              icon={mdiTicketOutline}
              delta={-3.2}
              deltaInverted
              chart={<DashBausteineSparkline values={sections.sparkTickets} label="Ticketverlauf" />}
            />
            <DashKpiCard
              label="Bestellungen"
              value="986"
              icon={mdiReceiptTextOutline}
              delta={0}
              footer="inkl. Abendkasse"
              chart={<DashBausteineSparkline values={sections.sparkOrders} label="Bestellverlauf" />}
            />
            <DashKpiCard label="Ø Bestellwert" value="32,40 €" icon={mdiCashRegister} loading />
          </div>
        </DashSection>

        <DashSection title="Sperrzustand" description="Schloss-Icon in einer Karte.">
          <div class="max-w-md">
            <DashLockedState description="Nur für Finanzen. Bitte die Rolle wechseln oder ein Teammitglied mit Finanzrechten fragen." />
          </div>
        </DashSection>

        <DashSection
          title="Exportmenü"
          description="Gruppen mit Zeilenhinweis; lädt eine Demo-Tabelle mit 20 Zeilen als CSV, Excel oder PDF."
          actions={
            <DashExportMenu
              groups={[
                { id: "teilnehmer", label: "Teilnehmerliste", count: 20, formats: ["csv", "xlsx", "pdf"] },
                { id: "bestellungen", label: "Bestellungen", count: 20, formats: ["csv", "xlsx"] },
                { id: "checkins", label: "Check-ins", count: 20, formats: ["csv"] },
              ]}
              onExport={(groupId, format) =>
                dashTableExport({
                  format,
                  fileParts: [groupId === "teilnehmer" ? "Teilnehmerliste" : groupId, "Indie Night"],
                  title: groupId === "teilnehmer" ? "Teilnehmerliste · Indie Night" : `${groupId} · Indie Night`,
                  subtitle: "Kulturhaus Lindenhof · Demo-Export",
                  columns: [
                    { header: "Name" },
                    { header: "Art", align: "center" },
                    { header: "Code" },
                    { header: "Betrag", align: "right" },
                  ],
                  rows: sections.demoRows.map((row) => [row.name, row.art, row.code, row.betrag]),
                  checkboxColumn: format === "pdf",
                  orientation: "landscape",
                  now: new Date(),
                }).then(() => undefined)
              }
            />
          }
        >
          <p class="text-sm text-content-muted">
            Der Button oben rechts exportiert echte Dateien. Jede Gruppe meldet Zeilenzahl und Formate.
          </p>
        </DashSection>

        <DashSection title="Organisations-Logo" description="Alle Größen, mit Bild und als Initialen-Fallback.">
          <div class="flex flex-wrap items-end gap-4">
            <For each={logoSizes}>
              {(size) => (
                <div class="flex flex-col items-center gap-1.5">
                  <DashOrgLogo name="Kulturhaus Lindenhof e.V." logoDataUrl={null} size={size} />
                  <span class="text-xs text-content-muted">{size}</span>
                </div>
              )}
            </For>
            <div class="flex flex-col items-center gap-1.5">
              <DashOrgLogo
                name="Kulturhaus Lindenhof e.V."
                logoDataUrl="https://i.pravatar.cc/96?img=12"
                size={logoSize()}
                shape="circle"
              />
              <span class="text-xs text-content-muted">Bild</span>
            </div>
          </div>
          <div class="mt-4 max-w-xs">
            <SegmentedControl
              value={state.logoSizeSignal.get()}
              onChange={state.logoSizeSignal.set}
              options={logoSizes.map((size) => ({ value: size, label: size }))}
              ariaLabel="Logogröße wählen"
              size="sm"
            />
          </div>
        </DashSection>

        <DashSection title="Social-Links" description="Runde Icon-Buttons und Chips, nur für befüllte Netzwerke.">
          <div class="flex flex-col gap-4">
            <div>
              <p class="mb-2 text-xs font-medium text-content-muted">Icons</p>
              <DashSocialLinks
                socials={state.socialsSignal.get()}
                website={state.websiteSignal.get()}
                name="Kulturhaus Lindenhof e.V."
              />
            </div>
            <div>
              <p class="mb-2 text-xs font-medium text-content-muted">Chips</p>
              <DashSocialLinks
                socials={state.socialsSignal.get()}
                website={state.websiteSignal.get()}
                name="Kulturhaus Lindenhof e.V."
                variant="chip"
                size="sm"
              />
            </div>
          </div>
        </DashSection>

        <DashSection
          title="Sektionen und Felder"
          description="Kartenkopf mit Aktionen, Fehler- und Infozustände, Definitionsliste."
          actions={
            <Button size="sm" variant="outline">
              Aktion
            </Button>
          }
          footer="Fußzeile der Sektion mit ergänzendem Hinweis."
        >
          <div class="flex flex-col gap-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <DashField label="Name" for="ui-kit-bausteine-name" required hint="So steht es auf Tickets.">
                <Input
                  id="ui-kit-bausteine-name"
                  value={state.nameSignal.get()}
                  onInput={(event) => state.nameSignal.set(event.currentTarget.value)}
                  class="h-10 text-sm rounded-control"
                />
              </DashField>
              <DashField
                label="E-Mail"
                for="ui-kit-bausteine-email"
                error="Diese E-Mail ist bereits vergeben."
                info="Benachrichtigungen und Abrechnungen gehen an diese Adresse."
              >
                <Input
                  id="ui-kit-bausteine-email"
                  type="email"
                  value={state.emailSignal.get()}
                  onInput={(event) => state.emailSignal.set(event.currentTarget.value)}
                  class="h-10 text-sm rounded-control"
                  aria-invalid="true"
                />
              </DashField>
            </div>
            <DashField label="Beschreibung" for="ui-kit-bausteine-beschreibung" hint="Maximal 1000 Zeichen.">
              <Textarea
                id="ui-kit-bausteine-beschreibung"
                rows={3}
                class="text-sm rounded-control"
                value="Kulturhaus Lindenhof: Konzerte, Lesungen und Feste im grünen Hof."
                readOnly
              />
            </DashField>
            <DashDescriptionList
              columns={2}
              items={[
                { label: "Veranstalter", value: "Kulturhaus Lindenhof e.V." },
                { label: "Bestellnummer", value: "EV-260412", mono: true },
                { label: "Status", value: "Bezahlt" },
                {
                  label: "Ansprechpartner",
                  value: (
                    <span>
                      Mara Lindner ·{" "}
                      <a href="mailto:hallo@kulturhaus-lindenhof.de" class="underline">
                        hallo@kulturhaus-lindenhof.de
                      </a>
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </DashSection>

        <DashSection title="Geldbeträge" description="Deutsches Format, Tabellenziffern, echtes Minus.">
          <div class="flex flex-col gap-2 text-sm">
            <p class="flex items-center justify-between gap-4">
              <span class="text-content-muted">Ticketumsatz</span>
              <DashMoney cents={2438000} />
            </p>
            <p class="flex items-center justify-between gap-4">
              <span class="text-content-muted">Erstattung</span>
              <DashMoney cents={-12000} signed />
            </p>
            <p class="flex items-center justify-between gap-4">
              <span class="text-content-muted">Offen (gedimmt)</span>
              <DashMoney cents={4500} muted />
            </p>
            <p class="flex items-center justify-between gap-4">
              <span class="text-content-muted">Gratis-Ticket</span>
              <DashMoney cents={0} />
            </p>
          </div>
        </DashSection>

        <DashSection title="Referenz" description="Alle Bausteine dieser Galerie im Überblick.">
          <p class="text-xs text-content-muted">{sections.kpiMeta.map((meta) => meta.label).join(" · ")}</p>
        </DashSection>
      </UiContainer>
    </DemoScenarioFrame>
  )
}
