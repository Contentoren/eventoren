import { Show } from "solid-js"
import { useNavigate } from "@tanstack/solid-router"
import { mdiDotsVertical } from "@adaptive-ds/mdi/mdiDotsVertical.js"
import { mdiDownloadOutline } from "@adaptive-ds/mdi/mdiDownloadOutline.js"
import { mdiLayersTripleOutline } from "@adaptive-ds/mdi/mdiLayersTripleOutline.js"
import { mdiPlus } from "@adaptive-ds/mdi/mdiPlus.js"
import { mdiTicketPercentOutline } from "@adaptive-ds/mdi/mdiTicketPercentOutline.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ConfirmDialog } from "#ui/interactive/dialog/ConfirmDialog.jsx"
import { DropdownMenu } from "#ui/interactive/menu/DropdownMenu.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { TabNav } from "#ui/interactive/tabs/TabNav.jsx"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import type { DashEvent } from "../../../model/dashEventSchema.ts"
import { dashStateGet } from "../../../store/dashStateGet.ts"
import { dashCan } from "../../../store/dashCan.ts"
import { dashNow } from "../../../store/dashNow.ts"
import { dashTableExport } from "../../../export/dashTableExport.ts"
import { dashCodeBulkPatch } from "../../../store/actions/codes/dashCodeBulkPatch.ts"
import { dashCodeDelete } from "../../../store/actions/codes/dashCodeDelete.ts"
import { dashCodeSetActive } from "../../../store/actions/codes/dashCodeSetActive.ts"
import { DashPageHeader } from "../../../ui/DashPageHeader.tsx"
import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashDateTimeInput } from "../../../ui/form/DashDateTimeInput.tsx"
import { DashCodesStateCreate } from "../DashCodesStateCreate.ts"
import { dashCodesExportRows } from "../dashCodesExport.ts"
import { DashCodesList } from "./DashCodesList.tsx"
import { DashCodeSheet, DashCodeSheetStateCreate } from "./DashCodeSheet.tsx"
import { DashCodeBulkDialog } from "./DashCodeBulkDialog.tsx"

export type DashCodesSearch = {
  art: "rabatt" | "zugang"
  code: string | undefined
  mehrere: boolean
}

/** Seite „Codes“: Tabs, Tabelle mit Bulk-Leiste, Sheet und Bulk-Dialog. */
export function DashCodesPage(p: { eventId: string; search: DashCodesSearch }) {
  const navigate = useNavigate()
  const now = dashNow()
  const listState = DashCodesStateCreate()

  const event = (): DashEvent | null => dashStateGet().events.find((candidate) => candidate.id === p.eventId) ?? null
  const canEdit = () => dashCan("codes.bearbeiten")

  const codes = () =>
    dashStateGet()
      .codes.filter((code) => code.eventId === p.eventId && code.kind === p.search.art)
      .sort((a, b) => a.code.localeCompare(b.code, "de"))
  const types = () =>
    dashStateGet()
      .ticketTypes.filter((type) => type.eventId === p.eventId)
      .sort((a, b) => a.sortOrder - b.sortOrder)

  const selectedId = () => p.search.code
  const selected = () => {
    const id = selectedId()
    if (!id || id === "neu") return null
    return dashStateGet().codes.find((code) => code.id === id && code.eventId === p.eventId) ?? null
  }
  const sheetOpen = () => selectedId() !== undefined && (selectedId() === "neu" || selected() !== null)

  const sheetStateCache = new Map<string, ReturnType<typeof DashCodeSheetStateCreate>>()
  const sheetState = () => {
    const key = selectedId() ?? ""
    const hit = sheetStateCache.get(key)
    if (hit) return hit
    const created = DashCodeSheetStateCreate(selected())
    sheetStateCache.set(key, created)
    return created
  }

  const patchSearch = (patch: Partial<DashCodesSearch>) => {
    const next: Record<string, unknown> = { art: patch.art ?? p.search.art }
    const code = patch.code !== undefined ? patch.code : p.search.code
    if (code !== undefined) next["code"] = code
    if ((patch.mehrere ?? p.search.mehrere) === true) next["mehrere"] = 1
    void navigate({
      to: `/demo/dashboard/events/${p.eventId}/codes` as never,
      search: next as never,
      replace: false,
      resetScroll: false,
    })
  }

  const selectArt = (id: string) => {
    listState.selectedKeys.set([])
    patchSearch({ art: id === "zugang" ? "zugang" : "rabatt", code: undefined, mehrere: false })
  }

  const openCode = (codeId: string) => patchSearch({ code: codeId })
  const openNew = () => patchSearch({ code: "neu" })
  const openBulk = () => patchSearch({ mehrere: true })

  const toggleActive = (rowId: string, active: boolean) => {
    const result = dashCodeSetActive([rowId], active)
    if (!result.success) toastAdd({ title: result.errorMessage, variant: "error" })
    else toastAdd({ title: active ? "Code aktiviert" : "Code deaktiviert", variant: "success" })
  }

  const bulkActivate = (keys: string[], active: boolean) => {
    const result = dashCodeSetActive(keys, active)
    if (!result.success) toastAdd({ title: result.errorMessage, variant: "error" })
    else {
      toastAdd({
        title: active ? `${keys.length} Codes aktiviert` : `${keys.length} Codes deaktiviert`,
        variant: "success",
      })
      listState.selectedKeys.set([])
    }
  }

  const bulkLimitSave = () => {
    const raw = listState.limitValue.get().trim()
    const parsed = raw === "" ? null : Number.parseInt(raw, 10)
    if (parsed !== null && (!Number.isInteger(parsed) || parsed < 1)) {
      toastAdd({ title: "Das Limit muss eine ganze Zahl ab 1 sein.", variant: "error" })
      return
    }
    const result = dashCodeBulkPatch(listState.selectedKeys.get(), { maxTickets: parsed })
    if (!result.success) toastAdd({ title: result.errorMessage, variant: "error" })
    else {
      toastAdd({ title: "Limit geändert", variant: "success" })
      listState.limitOpen.set(false)
      listState.limitValue.set("")
      listState.selectedKeys.set([])
    }
  }

  const bulkValiditySave = () => {
    const result = dashCodeBulkPatch(listState.selectedKeys.get(), {
      validUntil: listState.validityValue.get(),
    })
    if (!result.success) toastAdd({ title: result.errorMessage, variant: "error" })
    else {
      toastAdd({ title: "Gültigkeit geändert", variant: "success" })
      listState.validityOpen.set(false)
      listState.validityValue.set(null)
      listState.selectedKeys.set([])
    }
  }

  const bulkDeleteConfirm = () => {
    const result = dashCodeDelete(listState.selectedKeys.get())
    listState.deleteOpen.set(false)
    if (!result.success) toastAdd({ title: result.errorMessage, variant: "error" })
    else {
      const text =
        result.data.skipped > 0
          ? `${result.data.deleted} gelöscht · ${result.data.skipped} genutzte übersprungen`
          : `${result.data.deleted} gelöscht`
      toastAdd({ title: text, variant: "success" })
      listState.selectedKeys.set([])
    }
  }

  const exportCsv = () => {
    const all = dashStateGet()
      .codes.filter((code) => code.eventId === p.eventId)
      .sort((a, b) => a.code.localeCompare(b.code, "de"))
    const built = dashCodesExportRows(all, types())
    void dashTableExport({
      format: "csv",
      fileParts: ["codes", event()?.title ?? p.eventId],
      title: `Codes ${event()?.title ?? ""}`,
      columns: built.header.map((header) => ({ header })),
      rows: built.rows,
      now: now(),
    }).then((result) => {
      if (!result.success) toastAdd({ title: result.errorMessage, variant: "error" })
      else toastAdd({ title: "CSV exportiert", variant: "success" })
    })
  }

  const counts = () => {
    const all = dashStateGet().codes.filter((code) => code.eventId === p.eventId)
    return {
      rabatt: all.filter((code) => code.kind === "rabatt").length,
      zugang: all.filter((code) => code.kind === "zugang").length,
    }
  }

  return (
    <div>
      <Show when={event()}>
        {(current) => (
          <>
            <DashPageHeader
              title="Codes"
              description="Rabatt- und Zugangscodes."
              actions={
                <>
                  <Show when={canEdit()}>
                    <Button type="button" variant="outline" class="h-9 px-3 text-sm" onClick={openBulk}>
                      <Icon path={mdiLayersTripleOutline} class="size-4" />
                      Mehrere erstellen
                    </Button>
                    <Button type="button" variant="contrast" class="h-9 px-3 text-sm" onClick={openNew}>
                      <Icon path={mdiPlus} class="size-4" />
                      Code erstellen
                    </Button>
                  </Show>
                  <DropdownMenu
                    triggerIcon={mdiDotsVertical}
                    triggerAriaLabel="Weitere Aktionen"
                    items={[
                      {
                        type: "item",
                        id: "csv",
                        label: "Als CSV exportieren",
                        icon: mdiDownloadOutline,
                        onSelect: exportCsv,
                      },
                    ]}
                  />
                </>
              }
            />
            <div class="mb-3">
              <TabNav
                items={[
                  { id: "rabatt", label: "Rabattcodes", count: counts().rabatt },
                  { id: "zugang", label: "Zugangscodes", count: counts().zugang },
                ]}
                active={p.search.art}
                onSelect={selectArt}
                ariaLabel="Codearten"
              />
            </div>
            <div class="rounded-card border border-border-subtle bg-surface">
              <DashCodesList
                rows={codes()}
                types={types()}
                selectedKeys={listState.selectedKeys.get()}
                onSelectedKeysChange={(keys) => listState.selectedKeys.set(keys)}
                onSelect={(row) => openCode(row.id)}
                onToggleActive={(row, active) => toggleActive(row.id, active)}
                canEdit={canEdit()}
                bulkActions={(keys) => (
                  <span class="inline-flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="h-9 px-3 text-sm"
                      onClick={() => bulkActivate(keys, true)}
                    >
                      Aktivieren
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="h-9 px-3 text-sm"
                      onClick={() => bulkActivate(keys, false)}
                    >
                      Deaktivieren
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="h-9 px-3 text-sm"
                      onClick={() => listState.validityOpen.set(true)}
                    >
                      Gültigkeit ändern
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="h-9 px-3 text-sm"
                      onClick={() => listState.limitOpen.set(true)}
                    >
                      Limit ändern
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="h-9 px-3 text-sm"
                      onClick={() => listState.deleteOpen.set(true)}
                    >
                      Löschen
                    </Button>
                  </span>
                )}
                empty={
                  <span class="inline-flex flex-col items-center gap-2 py-8">
                    <EmptyState
                      icon={mdiTicketPercentOutline}
                      title="Noch keine Codes"
                      description={
                        p.search.art === "rabatt"
                          ? "Erstelle deinen ersten Rabattcode."
                          : "Erstelle deinen ersten Zugangscode."
                      }
                      actions={
                        <Show when={canEdit()}>
                          <Button type="button" variant="contrast" class="h-9 px-3 text-sm" onClick={openNew}>
                            <Icon path={mdiPlus} class="size-4" />
                            Code erstellen
                          </Button>
                        </Show>
                      }
                    />
                  </span>
                }
              />
            </div>
            <Show when={sheetOpen()}>
              <DashCodeSheet
                open
                event={current()}
                existing={selected()}
                types={types()}
                codes={dashStateGet().codes}
                canEdit={canEdit()}
                state={sheetState()}
              />
            </Show>
            <Show when={p.search.mehrere}>
              <DashCodeBulkDialog
                open
                event={current()}
                types={types()}
                codes={dashStateGet()
                  .codes.filter((code) => code.eventId === p.eventId)
                  .map((code) => code.code)}
                canEdit={canEdit()}
              />
            </Show>
            <Show when={listState.limitOpen.get()}>
              <div
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                role="dialog"
                aria-modal="true"
                aria-label="Limit ändern"
              >
                <div class="w-full max-w-sm rounded-card border border-border-subtle bg-surface p-4">
                  <DashField label="Limit je Code" hint="Leer lassen für unbegrenzt">
                    <Input
                      class="h-10 text-sm rounded-control"
                      inputmode="numeric"
                      value={listState.limitValue.get()}
                      onInput={(event) => listState.limitValue.set(event.currentTarget.value.replace(/[^0-9]/g, ""))}
                      placeholder="Unbegrenzt"
                    />
                  </DashField>
                  <div class="mt-4 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      class="h-9 px-3 text-sm"
                      onClick={() => listState.limitOpen.set(false)}
                    >
                      Abbrechen
                    </Button>
                    <Button type="button" variant="contrast" class="h-9 px-3 text-sm" onClick={bulkLimitSave}>
                      Speichern
                    </Button>
                  </div>
                </div>
              </div>
            </Show>
            <Show when={listState.validityOpen.get()}>
              <div
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                role="dialog"
                aria-modal="true"
                aria-label="Gültigkeit ändern"
              >
                <div class="w-full max-w-sm rounded-card border border-border-subtle bg-surface p-4">
                  <DashField label="Gültig bis" hint="Leer lassen für unbegrenzt">
                    <DashDateTimeInput
                      valueIso={listState.validityValue.get()}
                      onChange={(iso) => listState.validityValue.set(iso)}
                    />
                  </DashField>
                  <div class="mt-4 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      class="h-9 px-3 text-sm"
                      onClick={() => listState.validityOpen.set(false)}
                    >
                      Abbrechen
                    </Button>
                    <Button type="button" variant="contrast" class="h-9 px-3 text-sm" onClick={bulkValiditySave}>
                      Speichern
                    </Button>
                  </div>
                </div>
              </div>
            </Show>
            <ConfirmDialog
              open={listState.deleteOpen.get()}
              onOpenChange={(open) => listState.deleteOpen.set(open)}
              title={`${listState.selectedKeys.get().length} Codes löschen?`}
              description="Bereits genutzte Codes bleiben erhalten und werden übersprungen."
              confirmLabel="Löschen"
              tone="danger"
              onConfirm={bulkDeleteConfirm}
            />
          </>
        )}
      </Show>
    </div>
  )
}
