import { mdiDownloadOutline } from "@adaptive-ds/mdi/mdiDownloadOutline.js"
import { For, Show, createSignal } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Sheet } from "#ui/interactive/sheet/Sheet.jsx"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { DashMoney } from "../../ui/money/DashMoney.tsx"
import { DashOrgLogo } from "../../ui/org/DashOrgLogo.tsx"
import { DashStatusPill } from "../../ui/status/DashStatusPill.tsx"
import { dashDateFormat } from "../../model/dashDateFormat.ts"
import { dashAccountInvoiceDownload } from "../dashAccountInvoiceDownload.ts"
import { dashAccountMethodLabel } from "../model/dashAccountMethodLabel.ts"
import type { DashAccountOrderRow } from "../model/dashAccountOrderRow.ts"
import type { DashOrg } from "../../model/dashOrgSchema.ts"

export function DashAccountOrderSheet(p: {
  row: DashAccountOrderRow | null
  org: DashOrg | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [downloading, setDownloading] = createSignal(false)

  const downloadInvoice = async () => {
    const id = p.row?.order.id
    if (!id || downloading()) return
    setDownloading(true)
    try {
      const result = await dashAccountInvoiceDownload(id, new Date())
      if (result.success) {
        toastAdd({ title: "Rechnung wird heruntergeladen", variant: "success" })
      } else {
        toastAdd({ title: result.errorMessage, variant: "error" })
      }
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Sheet
      open={p.open}
      onOpenChange={p.onOpenChange}
      size="lg"
      title={p.row ? `Bestellung ${p.row.order.number}` : "Bestellung"}
      description={p.row?.eventTitle}
      headerActions={p.row ? <DashStatusPill kind="order" value={p.row.order.status} /> : undefined}
    >
      <Show when={p.row}>
        {(row) => (
          <div class="flex flex-col gap-6">
            <div class="flex flex-wrap items-baseline justify-between gap-2 rounded-control border border-border-subtle bg-surface-muted px-4 py-3">
              <div class="text-xs text-content-muted">
                {dashDateFormat(row().order.createdAt, "lang")} · Rechnung {row().order.invoiceNumber}
              </div>
              <div class="text-2xl font-semibold tabular-nums">
                <DashMoney cents={row().order.totalCents} />
              </div>
            </div>

            <section aria-label="Positionen">
              <h2 class="text-sm font-semibold">Positionen</h2>
              <dl class="mt-2 flex flex-col gap-1 text-sm">
                <For each={row().order.lines}>
                  {(line) => (
                    <div class="flex items-baseline justify-between gap-3">
                      <dt class="min-w-0 text-content-muted">
                        {line.quantity} × {line.name}
                      </dt>
                      <dd class="shrink-0 tabular-nums">
                        <DashMoney cents={line.unitPriceCents * line.quantity} />
                      </dd>
                    </div>
                  )}
                </For>
                <div class="flex items-baseline justify-between gap-3">
                  <dt class="min-w-0 text-content-muted">Servicegebühr</dt>
                  <dd class="shrink-0 tabular-nums">
                    <DashMoney cents={row().order.serviceFeeCents} />
                  </dd>
                </div>
                <For each={row().order.refunds}>
                  {(refund) => (
                    <div class="flex items-baseline justify-between gap-3">
                      <dt class="min-w-0 text-content-muted">Erstattung ({refund.reason})</dt>
                      <dd class="shrink-0 tabular-nums">
                        <DashMoney cents={-(refund.amountCents - (refund.feeCents ?? 0))} signed />
                      </dd>
                    </div>
                  )}
                </For>
                <div class="flex items-baseline justify-between gap-3 border-t border-border-subtle pt-1 font-semibold">
                  <dt>Summe</dt>
                  <dd class="tabular-nums">
                    <DashMoney cents={row().order.totalCents} />
                  </dd>
                </div>
              </dl>
              <p class="mt-2 text-sm text-content-muted">
                Zahlart: {dashAccountMethodLabel(row().order.payment.method).label}
              </p>
              <div class="mt-3">
                <Button
                  type="button"
                  variant="outline"
                  class="h-9 px-3 text-sm"
                  disabled={downloading()}
                  onClick={() => void downloadInvoice()}
                >
                  <Icon path={mdiDownloadOutline} class="size-4" />
                  {downloading() ? "Wird erstellt …" : "Rechnung (PDF)"}
                </Button>
              </div>
            </section>

            <Show when={p.org}>
              {(org) => (
                <section aria-label="Veranstalter" class="rounded-card border border-border-subtle p-4">
                  <div class="flex items-center gap-3">
                    <DashOrgLogo name={org().name} logoDataUrl={org().logoDataUrl} size="md" />
                    <div class="min-w-0 flex-1">
                      <p class="truncate font-semibold">{org().name}</p>
                      <p class="truncate text-sm text-content-muted">{org().subtitle}</p>
                    </div>
                    <Show when={p.org}>
                      {(org) => (
                        <LinkButtonInternal
                          to="/demo/customer/veranstalter/$orgSlug"
                          params={{ orgSlug: org().slug }}
                          variant="outline"
                          size="sm"
                        >
                          Veranstalter-Profil
                        </LinkButtonInternal>
                      )}
                    </Show>
                  </div>
                </section>
              )}
            </Show>
          </div>
        )}
      </Show>
    </Sheet>
  )
}
