import { mdiAlertOutline } from "@adaptive-ds/mdi/mdiAlertOutline.js"
import { mdiCalendarMonthOutline } from "@adaptive-ds/mdi/mdiCalendarMonthOutline.js"
import { mdiCashRefund } from "@adaptive-ds/mdi/mdiCashRefund.js"
import { mdiEmailOutline } from "@adaptive-ds/mdi/mdiEmailOutline.js"
import { mdiTicketOutline } from "@adaptive-ds/mdi/mdiTicketOutline.js"
import { For, Show } from "solid-js"
import { ConfirmDialog } from "#ui/interactive/dialog/ConfirmDialog.jsx"
import { ModalDialog } from "#ui/interactive/dialog/ModalDialog.jsx"
import { StickySaveBar } from "#ui/interactive/savebar/StickySaveBar.jsx"
import { Sheet, type SheetSize } from "#ui/interactive/sheet/Sheet.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { uiKitOverlaysGalleryStateCreate } from "../gallery/uiKitOverlaysGalleryStateCreate.ts"

const sheetSizes: { size: SheetSize; label: string; width: string }[] = [
  { size: "sm", label: "SM", width: "400 px" },
  { size: "md", label: "MD", width: "480 px" },
  { size: "lg", label: "LG", width: "560 px" },
  { size: "xl", label: "XL", width: "720 px" },
]

const longText = `Die Indie Night bringt vier Bands auf die Bühne des Lindenhofs: Von
Indie-Rock über Dream-Pop bis zu elektronischen Sets ist alles dabei. Einlass ist
um 20:00 Uhr, Beginn um 20:30 Uhr. Die Abendkasse öffnet eine Stunde vorher.`

/** Overlay kit gallery: sheets in all sizes, confirm dialogs, mini form with save bar. */
export function UiKitOverlaysGallery() {
  const state = uiKitOverlaysGalleryStateCreate()

  return (
    <div class="flex flex-col gap-6">
      <section class="rounded-card border border-border-subtle bg-surface p-4 sm:p-5">
        <h2 class="text-sm font-semibold">Sheet</h2>
        <p class="mt-1 text-sm text-content-muted">
          Seitenpanel von rechts (Desktop), Bottom-Sheet mit Griff (mobil). Esc und Klick aufs Overlay schließen.
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <For each={sheetSizes}>
            {(entry) => (
              <Button variant="outline" onClick={() => state.openSheet(entry.size)}>
                {entry.label} · {entry.width}
              </Button>
            )}
          </For>
        </div>
      </section>

      <section class="rounded-card border border-border-subtle bg-surface p-4 sm:p-5">
        <h2 class="text-sm font-semibold">Bestätigungsdialog</h2>
        <p class="mt-1 text-sm text-content-muted">
          Folgen als Liste, roter Bestätigen-Button. Bei Absagen den Eventnamen eintippen.
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <Button variant="outlineRed" onClick={() => state.confirmDangerOpen.set(true)}>
            Absagen (Folgen)
          </Button>
          <Button variant="outline" onClick={() => state.confirmNameOpen.set(true)}>
            Löschen (Name eintippen)
          </Button>
        </div>
      </section>

      <section class="rounded-card border border-border-subtle bg-surface p-4 sm:p-5">
        <h2 class="text-sm font-semibold">Verschachtelt</h2>
        <p class="mt-1 text-sm text-content-muted">
          Dialog aus dem Sheet heraus: Sheet bleibt offen, Esc schließt nur die oberste Ebene.
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => state.nestedOpen.set(true)}>
            Bestellung öffnen
          </Button>
        </div>
      </section>

      <section class="rounded-card border border-border-subtle bg-surface p-4 sm:p-5">
        <h2 class="text-sm font-semibold">Mini-Formular</h2>
        <p class="mt-1 text-sm text-content-muted">
          Ändere ein Feld: Die Speicherleiste erscheint unten. Strg/⌘+S speichert, Verwerfen setzt zurück.
        </p>
        <div class="mt-3 grid max-w-lg gap-3">
          <div>
            <Label for="gallery-titel">Titel</Label>
            <Input
              id="gallery-titel"
              class="mt-1.5"
              value={state.title.get()}
              onInput={(event) => state.title.set(event.currentTarget.value)}
            />
          </div>
          <div>
            <Label for="gallery-ort">Ort</Label>
            <Input
              id="gallery-ort"
              class="mt-1.5"
              value={state.ort.get()}
              onInput={(event) => state.ort.set(event.currentTarget.value)}
            />
          </div>
        </div>
      </section>

      <Sheet
        open={state.sheetOpen.get()}
        onOpenChange={(open) => state.closeSheet(open)}
        title="Event bearbeiten"
        description="Änderungen werden erst mit Speichern übernommen."
        size={state.sheetSize.get()}
        headerActions={
          <Button variant="ghost" size="sm" onClick={() => state.closeSheet(false)}>
            Als Entwurf
          </Button>
        }
        footer={
          <>
            <Button variant="outline" onClick={() => state.closeSheet(false)}>
              Abbrechen
            </Button>
            <Button variant="contrast" onClick={() => state.closeSheet(false)}>
              Speichern
            </Button>
          </>
        }
      >
        <div class="flex flex-col gap-4">
          <div class="flex items-center gap-3 rounded-control bg-surface-muted px-4 py-3">
            <Icon path={mdiCalendarMonthOutline} class="size-5 text-brand" />
            <div class="min-w-0">
              <p class="text-sm font-semibold">Indie Night: Lichtspiel</p>
              <p class="text-xs text-content-muted">Sa, 20:30 Uhr · Lindenhof, Halle · 318 / 480 verkauft</p>
            </div>
          </div>
          <For each={[1, 2, 3, 4, 5, 6]}>
            {(block) => (
              <div class="rounded-control border border-border-subtle p-4">
                <h3 class="text-sm font-semibold">Abschnitt {block}</h3>
                <p class="mt-1 text-sm text-content-muted">{longText}</p>
              </div>
            )}
          </For>
        </div>
      </Sheet>

      <ConfirmDialog
        open={state.confirmDangerOpen.get()}
        onOpenChange={(open) => state.closeDanger(open)}
        title="Event absagen?"
        description="Das kannst du nicht rückgängig machen."
        consequences={[
          { text: "3 Tickets werden ungültig", icon: mdiTicketOutline, tone: "danger" },
          { text: "45,00 € werden erstattet", icon: mdiAlertOutline, tone: "warning" },
          { text: "Alle Käufer bekommen eine E-Mail", icon: mdiEmailOutline, tone: "neutral" },
        ]}
        confirmLabel="Event absagen"
        tone="danger"
        onConfirm={() => state.confirmDanger()}
      />

      <ConfirmDialog
        open={state.confirmNameOpen.get()}
        onOpenChange={(open) => state.closeName(open)}
        title="Event löschen?"
        description="Gib zur Bestätigung den Eventnamen ein."
        confirmLabel="Endgültig löschen"
        tone="danger"
        requireText="Indie Night"
        onConfirm={() => state.confirmName()}
      />

      <Sheet
        open={state.nestedOpen.get()}
        onOpenChange={(open) => state.closeNested(open)}
        title="Bestellung #1042"
        description="2 Tickets · Indie Night: Lichtspiel · Käuferin: Mara Jensen."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => state.nestedConfirmOpen.set(true)}>
              Erstattung ablehnen
            </Button>
            <Button variant="contrast" onClick={() => state.nestedModalOpen.set(true)}>
              Dialog öffnen
            </Button>
          </>
        }
      >
        <div class="flex flex-col gap-4">
          <div class="flex items-center gap-3 rounded-control bg-surface-muted px-4 py-3">
            <Icon path={mdiTicketOutline} class="size-5 text-brand" />
            <div class="min-w-0">
              <p class="text-sm font-semibold">2 × Stehplatz · 48,00 €</p>
              <p class="text-xs text-content-muted">Bestellt vor 2 Stunden · Zahlung per Karte</p>
            </div>
          </div>
          <p class="text-sm text-content-muted">
            Die Käuferin bittet um eine Teilerstattung: Ein Ticket kann nicht genutzt werden. Öffne „Dialog öffnen“ für
            eine Notiz oder „Bestätigen“, um die Erstattung freizugeben. Beide Dialoge stapeln sich über diesem Sheet.
          </p>
          <ModalDialog
            nested
            open={state.nestedModalOpen.get()}
            onOpenChange={(open) => state.closeNestedModal(open)}
            title="Notiz hinterlegen"
            description="Die Notiz landet im Bestellverlauf."
            size="sm"
            footer={
              <>
                <Button variant="ghost" onClick={() => state.closeNestedModal(false)}>
                  Abbrechen
                </Button>
                <Button
                  variant="contrast"
                  disabled={state.nestedNote.get().trim().length === 0}
                  onClick={() => state.submitNestedNote()}
                >
                  Speichern
                </Button>
              </>
            }
          >
            <div>
              <Label for="gallery-verschachtelt-notiz">Notiz</Label>
              <Textarea
                id="gallery-verschachtelt-notiz"
                rows={4}
                class="mt-1.5"
                value={state.nestedNote.get()}
                onInput={(event) => state.nestedNote.set(event.currentTarget.value)}
                placeholder="z. B. Ein Ticket wird erstattet, Rest bleibt gültig."
              />
            </div>
          </ModalDialog>
          <ConfirmDialog
            nested
            open={state.nestedConfirmOpen.get()}
            onOpenChange={(open) => state.closeNestedConfirm(open)}
            title="24,00 € erstatten?"
            description="Die Teilerstattung geht an die ursprüngliche Zahlungsmethode."
            consequences={[
              { text: "1 Ticket wird ungültig", icon: mdiTicketOutline, tone: "danger" },
              { text: "24,00 € werden erstattet", icon: mdiCashRefund, tone: "warning" },
              { text: "Käuferin bekommt eine E-Mail", icon: mdiEmailOutline, tone: "neutral" },
            ]}
            confirmLabel="Erstatten"
            tone="danger"
            onConfirm={() => state.confirmNestedRefund()}
          />
        </div>
      </Sheet>

      <StickySaveBar
        visible={state.dirty()}
        onSave={() => state.save()}
        onDiscard={() => state.discard()}
        saving={state.saving.get()}
      />
    </div>
  )
}
