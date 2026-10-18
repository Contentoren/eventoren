import { mdiAccountGroupOutline } from "@adaptive-ds/mdi/mdiAccountGroupOutline.js"
import { mdiBankOutline } from "@adaptive-ds/mdi/mdiBankOutline.js"
import { mdiCalendarMonthOutline } from "@adaptive-ds/mdi/mdiCalendarMonthOutline.js"
import { mdiChartBoxOutline } from "@adaptive-ds/mdi/mdiChartBoxOutline.js"
import { mdiCogOutline } from "@adaptive-ds/mdi/mdiCogOutline.js"
import { mdiDelete } from "@adaptive-ds/mdi/mdiDelete.js"
import { mdiDotsHorizontal } from "@adaptive-ds/mdi/mdiDotsHorizontal.js"
import { mdiEyeOutline } from "@adaptive-ds/mdi/mdiEyeOutline.js"
import { mdiGiftOutline } from "@adaptive-ds/mdi/mdiGiftOutline.js"
import { mdiOpenInNew } from "@adaptive-ds/mdi/mdiOpenInNew.js"
import { mdiPencilOutline } from "@adaptive-ds/mdi/mdiPencilOutline.js"
import { mdiPlus } from "@adaptive-ds/mdi/mdiPlus.js"
import { mdiReceiptTextOutline } from "@adaptive-ds/mdi/mdiReceiptTextOutline.js"
import { mdiTicketOutline } from "@adaptive-ds/mdi/mdiTicketOutline.js"
import { mdiTicketPercentOutline } from "@adaptive-ds/mdi/mdiTicketPercentOutline.js"
import { mdiBackupRestore } from "@adaptive-ds/mdi/mdiBackupRestore.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { commandPaletteShortcutRegister } from "#ui/interactive/command/commandPaletteShortcutRegister.js"
import { CommandPalette, type CommandPaletteGroup } from "#ui/interactive/command/CommandPalette.jsx"
import { DropdownMenu, type DropdownMenuEntry } from "#ui/interactive/menu/DropdownMenu.jsx"
import { ImageDrop } from "#ui/input/image/ImageDrop.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { UiContainer } from "../../ui/UiContainer.tsx"
import { DemoScenarioFrame } from "../../demo/ui/DemoScenarioFrame.tsx"
import type { uiKitMenuesGalleryStateCreate } from "./uiKitMenuesGalleryStateCreate.ts"

const dotsMenuItemsCreate = (notify: (title: string, description?: string) => void): DropdownMenuEntry[] => [
  { type: "item", id: "open", label: "Öffnen", icon: mdiOpenInNew, onSelect: () => notify("Event geöffnet") },
  {
    type: "item",
    id: "duplizieren",
    label: "Duplizieren",
    icon: mdiBackupRestore,
    hint: "Strg+D",
    onSelect: () => notify("Event dupliziert", "Der Entwurf liegt in deiner Eventliste."),
  },
  { type: "separator" },
  {
    type: "item",
    id: "absagen",
    label: "Absagen",
    icon: mdiDelete,
    tone: "danger",
    onSelect: () => notify("Event abgesagt", "Alle Käufer bekommen eine E-Mail."),
  },
]

const labelledMenuItemsCreate = (notify: (title: string, description?: string) => void): DropdownMenuEntry[] => [
  { type: "label", label: "Event" },
  { type: "item", id: "ansehen", label: "Ansehen", icon: mdiEyeOutline, onSelect: () => notify("Vorschau geöffnet") },
  {
    type: "item",
    id: "bearbeiten",
    label: "Bearbeiten",
    icon: mdiPencilOutline,
    onSelect: () => notify("Bearbeiten geöffnet"),
  },
  { type: "separator" },
  { type: "label", label: "Verwalten" },
  {
    type: "item",
    id: "verkauf-pausieren",
    label: "Verkauf pausieren",
    icon: mdiTicketOutline,
    onSelect: () => notify("Verkauf pausiert"),
  },
  {
    type: "item",
    id: "loeschen",
    label: "Löschen",
    icon: mdiDelete,
    tone: "danger",
    onSelect: () => notify("Event gelöscht"),
  },
]

const paletteGroupsCreate = (notify: (title: string, description?: string) => void): CommandPaletteGroup[] => [
  {
    id: "seiten",
    label: "Seiten",
    items: [
      {
        id: "uebersicht",
        label: "Übersicht",
        description: "Kennzahlen und Verkaufskurve",
        icon: mdiChartBoxOutline,
        keywords: ["Dashboard", "Start"],
        hint: "G U",
        onSelect: () => notify("Übersicht geöffnet"),
      },
      {
        id: "events",
        label: "Events",
        description: "Aktuelle, Entwürfe und Vorlagen",
        icon: mdiCalendarMonthOutline,
        keywords: ["Veranstaltungen"],
        hint: "G E",
        onSelect: () => notify("Events geöffnet"),
      },
      {
        id: "bestellungen",
        label: "Bestellungen",
        description: "Suche nach Nummer oder Name",
        icon: mdiReceiptTextOutline,
        keywords: ["Tickets", "Käufer"],
        onSelect: () => notify("Bestellungen geöffnet"),
      },
      {
        id: "finanzen",
        label: "Finanzen",
        icon: mdiBankOutline,
        keywords: ["Auszahlung", "Abrechnung"],
        onSelect: () => notify("Finanzen geöffnet"),
      },
      {
        id: "team",
        label: "Team",
        icon: mdiAccountGroupOutline,
        keywords: ["Mitglieder", "Rollen"],
        onSelect: () => notify("Team geöffnet"),
      },
    ],
  },
  {
    id: "events",
    label: "Events",
    items: [
      {
        id: "indie-night",
        label: "Indie Night: Lichtspiel",
        description: "Heute · 318 / 480 verkauft",
        icon: mdiTicketOutline,
        keywords: ["Konzert", "live"],
        onSelect: () => notify("Indie Night geöffnet"),
      },
      {
        id: "jazz-wein",
        label: "Jazz & Wein",
        description: "In 3 Wochen · Phase 1 aktiv",
        icon: mdiTicketOutline,
        keywords: ["Konzert"],
        onSelect: () => notify("Jazz & Wein geöffnet"),
      },
      {
        id: "winterball",
        label: "Winterball im Lindenhof",
        description: "In 10 Wochen · Early Bird",
        icon: mdiTicketOutline,
        keywords: ["Ball", "Gala"],
        onSelect: () => notify("Winterball geöffnet"),
      },
    ],
  },
  {
    id: "aktionen",
    label: "Aktionen",
    items: [
      {
        id: "event-erstellen",
        label: "Event erstellen",
        icon: mdiPlus,
        keywords: ["Neu", "Assistent"],
        hint: "N",
        onSelect: () => notify("Assistent gestartet", "Schritt 1 von 3: Basisdaten."),
      },
      {
        id: "code-erstellen",
        label: "Code erstellen",
        icon: mdiTicketPercentOutline,
        keywords: ["Rabatt", "Zugang"],
        onSelect: () => notify("Code-Dialog geöffnet"),
      },
      {
        id: "gast-hinzufuegen",
        label: "Gast hinzufügen",
        icon: mdiAccountGroupOutline,
        keywords: ["Gästeliste", "Freikarte"],
        onSelect: () => notify("Gast hinzugefügt", "Die Einladung ist unterwegs."),
      },
      {
        id: "geschenk",
        label: "Gutschein verkaufen",
        icon: mdiGiftOutline,
        keywords: ["Geschenk"],
        onSelect: () => notify("Gutschein erstellt"),
      },
    ],
  },
]

export function UiKitMenuesGallery(props: { state: ReturnType<typeof uiKitMenuesGalleryStateCreate> }) {
  const state = props.state
  commandPaletteShortcutRegister(state.openPalette)

  return (
    <DemoScenarioFrame currentId="ui-kit-menues">
      <UiContainer width="wide" class="flex flex-col gap-6 py-10">
        <header class="flex flex-col gap-1">
          <h1 class="text-xl font-semibold tracking-tight text-content sm:text-2xl">Menüs-UI-Kit</h1>
          <p class="text-sm text-content-muted">Dropdown-Menüs, Befehlspalette und Bild-Upload zum Ausprobieren.</p>
        </header>

        <CardWrapper class="border-border-subtle">
          <h2 class="text-sm font-semibold text-content">⋯-Menü mit Danger-Eintrag</h2>
          <p class="mt-1 text-xs text-content-muted">
            Icon-only-Auslöser mit „Weitere Aktionen“. Tastatur: ↓ Öffnen, Pfeiltasten navigieren, Enter wählen, Esc
            schließen.
          </p>
          <div class="mt-3">
            <DropdownMenu
              items={dotsMenuItemsCreate(state.notify)}
              triggerIcon={mdiDotsHorizontal}
              triggerAriaLabel="Weitere Aktionen"
              align="end"
            />
          </div>
        </CardWrapper>

        <CardWrapper class="border-border-subtle">
          <h2 class="text-sm font-semibold text-content">Menü mit Labels, Icons und Shortcut</h2>
          <p class="mt-1 text-xs text-content-muted">Gruppen-Labels, Trennlinie und rechtsbündiger Hinweis.</p>
          <div class="mt-3">
            <DropdownMenu
              items={labelledMenuItemsCreate(state.notify)}
              triggerLabel="Event verwalten"
              triggerIcon={mdiCogOutline}
            />
          </div>
        </CardWrapper>

        <CardWrapper class="border-border-subtle">
          <h2 class="text-sm font-semibold text-content">Befehlspalette</h2>
          <p class="mt-1 text-xs text-content-muted">
            Drei Gruppen: Seiten, Events, Aktionen. Öffne sie per Button oder mit ⌘K / Strg+K.
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={state.openPalette}>
              Palette öffnen ⌘K
            </Button>
          </div>
          <CommandPalette
            open={state.paletteOpen.get()}
            onOpenChange={state.closePalette}
            groups={paletteGroupsCreate(state.notify)}
          />
        </CardWrapper>

        <div class="grid gap-6 md:grid-cols-2">
          <CardWrapper class="border-border-subtle">
            <h2 class="text-sm font-semibold text-content">Logo-Upload (quadratisch, rund)</h2>
            <p class="mt-1 text-xs text-content-muted">Center-Crop auf 512 px, Klick oder Drag &amp; Drop.</p>
            <ImageDrop
              class="mt-3"
              value={state.logoDataUrl.get()}
              onChange={state.setLogo}
              aspect="square"
              shape="circle"
              label="Organisationslogo"
              hint="Quadratisch zugeschnitten, max. 10 MB."
            />
          </CardWrapper>
          <CardWrapper class="border-border-subtle">
            <h2 class="text-sm font-semibold text-content">Titelbild (16:9)</h2>
            <p class="mt-1 text-xs text-content-muted">Center-Crop auf 16:9, Ausgabe als WebP mit Qualität 0,85.</p>
            <ImageDrop
              class="mt-3"
              value={state.bannerDataUrl.get()}
              onChange={state.setBanner}
              aspect="16:9"
              shape="rounded"
              label="Eventbild"
              hint="16:9 zugeschnitten, max. 10 MB."
            />
          </CardWrapper>
        </div>
      </UiContainer>
    </DemoScenarioFrame>
  )
}
