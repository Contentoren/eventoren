import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ConfirmDialog } from "#ui/interactive/dialog/ConfirmDialog.jsx"
import { Sheet } from "#ui/interactive/sheet/Sheet.jsx"
import { CopyButton } from "#ui/interactive/copy/CopyButton.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { SegmentedControl } from "#ui/input/segmented/SegmentedControl.jsx"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"
import { mdiLinkVariantPlus } from "@adaptive-ds/mdi/mdiLinkVariantPlus.js"
import { mdiQrcode } from "@adaptive-ds/mdi/mdiQrcode.js"
import { TicketQrCode } from "../../../../ticketing/TicketQrCode.tsx"
import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import { DashRelativeTime } from "../../../ui/time/DashRelativeTime.tsx"
import { dashScannerLinkUrl } from "../model/dashScannerLinkUrl.ts"
import { dashCheckinLinksStateCreate } from "./dashCheckinLinksStateCreate.ts"

/** Karte „Scanner-Links für Helfer": Liste mit QR, Kopieren, Widerrufen und Erstellen-Sheet. */
export function DashCheckinLinks(p: { eventId: string }) {
  const state = dashCheckinLinksStateCreate({ eventId: () => p.eventId })

  return (
    <>
      <DashSection
        title="Scanner-Links für Helfer"
        description="Ein Link pro Gerät — QR zeigen, weiterleiten oder widerrufen."
        actions={
          <Button type="button" variant="contrast" class="h-9 px-3 text-sm" onClick={state.openCreate}>
            Link erstellen
          </Button>
        }
      >
        <Show
          when={state.links().length > 0}
          fallback={
            <EmptyState
              icon={mdiLinkVariantPlus}
              title="Noch keine Scanner-Links"
              description="Erstelle einen Link pro Helfer-Gerät."
            />
          }
        >
          <ul class="flex flex-col divide-y divide-border-subtle">
            <For each={state.links()}>
              {(link) => (
                <li class="flex flex-wrap items-center gap-2 py-3">
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium text-content">
                      {link.label}
                      <Show when={link.revokedAt !== null}>
                        <span class="ml-2 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">
                          Widerrufen
                        </span>
                      </Show>
                    </p>
                    <p class="truncate text-xs text-content-muted">
                      {link.entrance} ·{" "}
                      <Show when={link.lastUsedAt} fallback="Noch nie">
                        {(used) => (
                          <span>
                            zuletzt <DashRelativeTime iso={used()} />
                          </span>
                        )}
                      </Show>
                    </p>
                  </div>
                  <div class="flex shrink-0 items-center gap-2">
                    <CopyButton value={dashScannerLinkUrl(link)} label="Kopieren" size="sm" class="h-9 px-3 text-sm" />
                    <Button type="button" variant="outline" class="h-9 px-3 text-sm" onClick={() => state.openQr(link)}>
                      QR
                    </Button>
                    <Show when={link.revokedAt === null}>
                      <Button
                        type="button"
                        variant="outline"
                        class="h-9 px-3 text-sm"
                        onClick={() => state.askRevoke(link)}
                      >
                        Widerrufen
                      </Button>
                    </Show>
                  </div>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </DashSection>
      <Show when={state.qrLink.get()}>
        {(qr) => (
          <Sheet
            open
            onOpenChange={(open) => {
              if (!open) state.closeQr()
            }}
            title={`Scanner-QR „${qr().label}“`}
            description={`${qr().entrance} · Helfer scannen diesen Code mit dem Handy.`}
            size="sm"
          >
            <div class="flex flex-col items-center gap-3">
              <TicketQrCode value={dashScannerLinkUrl(qr())} label={`Scanner-Link ${qr().label}`} />
              <p class="break-all text-center font-mono text-xs text-content-muted">{dashScannerLinkUrl(qr())}</p>
              <CopyButton value={dashScannerLinkUrl(qr())} label="Link kopieren" class="h-9 px-3 text-sm" />
            </div>
          </Sheet>
        )}
      </Show>
      <ConfirmDialog
        open={state.revokeLink.get() !== null}
        onOpenChange={(open) => {
          if (!open) state.closeRevoke()
        }}
        title={`„${state.revokeLink.get()?.label ?? ""}“ widerrufen?`}
        description="Der Link funktioniert danach nicht mehr. Bereits verteilte QR-Codes werden ungültig."
        confirmLabel="Widerrufen"
        tone="danger"
        onConfirm={state.revoke}
      />
      <Sheet
        open={state.createOpen.get()}
        onOpenChange={(open) => {
          if (!open) state.closeCreate()
        }}
        title="Scanner-Link erstellen"
        description="Ein Link pro Gerät, z. B. „Einlass Nord“ oder „Abendkasse 2“."
        size="sm"
        footer={
          <div class="flex justify-end gap-2">
            <Button type="button" variant="outline" class="h-9 px-3 text-sm" onClick={state.closeCreate}>
              Abbrechen
            </Button>
            <Button type="button" variant="contrast" class="h-9 px-3 text-sm" onClick={state.create}>
              Erstellen
            </Button>
          </div>
        }
      >
        <div class="flex flex-col gap-4">
          <DashField label="Bezeichnung" for="dash-scanner-label" required>
            <Input
              id="dash-scanner-label"
              value={state.label.get()}
              onInput={(event) => state.label.set(event.currentTarget.value)}
              placeholder="z. B. Einlass Nord"
              maxlength={40}
              class="h-9 text-sm"
            />
          </DashField>
          <DashField label="Eingang">
            <SegmentedControl
              value={state.entrance.get()}
              onChange={(value) =>
                state.entrance.set(
                  value === "Seiteneingang" ? "Seiteneingang" : value === "Abendkasse" ? "Abendkasse" : "Haupteingang",
                )
              }
              ariaLabel="Eingang wählen"
              options={state.entrances.map((entry) => ({ value: entry, label: entry }))}
            />
          </DashField>
        </div>
      </Sheet>
    </>
  )
}
