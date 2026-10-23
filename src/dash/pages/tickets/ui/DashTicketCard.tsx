import { mdiDragVertical } from "@adaptive-ds/mdi/mdiDragVertical.js"
import { mdiEyeOffOutline } from "@adaptive-ds/mdi/mdiEyeOffOutline.js"
import { cn } from "cn"
import { For, Show } from "solid-js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { ProgressBar } from "#ui/static/progress/ProgressBar.jsx"
import { dashCentsFormat } from "../../../model/dashCentsFormat.ts"
import { dashDateFormat } from "../../../model/dashDateFormat.ts"
import type { DashOrder } from "../../../model/dashOrderSchema.ts"
import { dashPhaseResolve } from "../../../model/dashPhaseResolve.ts"
import { dashRelativeTimeFormat } from "../../../model/dashRelativeTimeFormat.ts"
import type { DashTicket } from "../../../model/dashTicketSchema.ts"
import { dashTicketTypeSales } from "../../../model/dashTicketTypeSales.ts"
import type { DashTicketType } from "../../../model/dashTicketTypeSchema.ts"
import { DashMoney } from "../../../ui/money/DashMoney.tsx"

function endsHintText(args: {
  endsReason: "datum" | "kontingent" | null
  endsAt: string | null
  remaining: number | null
  now: Date
}): string | null {
  if (args.endsReason === "datum" && args.endsAt) return `endet ${dashRelativeTimeFormat(args.endsAt, args.now)}`
  if (args.endsReason === "kontingent" && args.remaining !== null)
    return args.remaining <= 1 ? "noch 1 Ticket" : `noch ${args.remaining} Tickets`
  return null
}

/** Karte einer Ticketart: Preis, Auslastung, Phasen-Zeitleiste. Klick öffnet das Sheet. */
export function DashTicketCard(p: {
  ticketType: DashTicketType
  orders: DashOrder[]
  tickets: DashTicket[]
  now: Date
  canEdit: boolean
  onOpen: () => void
  dragHandleProps: {
    draggable: boolean
    onDragStart: (event: DragEvent) => void
    onDragOver: (event: DragEvent) => void
    onDrop: (event: DragEvent) => void
    onDragEnd: () => void
  }
  isDragging: boolean
}) {
  const sales = () => dashTicketTypeSales({ ticketType: p.ticketType, orders: p.orders, tickets: p.tickets })
  const resolved = () => dashPhaseResolve(p.ticketType, sales().soldByPhase, p.now)

  const phaseState = (phaseId: string, index: number): "aktiv" | "beendet" | "geplant" => {
    const current = resolved()
    if (current.phase?.id === phaseId) return "aktiv"
    if (current.index === -1 && current.state === "beendet") return "beendet"
    if (index < current.index) return "beendet"
    if (current.index !== -1 && index > current.index) return "geplant"
    const soldInPhase = sales().soldByPhase[phaseId] ?? 0
    const phase = p.ticketType.phases.find((candidate) => candidate.id === phaseId)
    if (phase?.quota !== null && phase?.quota !== undefined && soldInPhase >= (phase?.quota ?? 0)) return "beendet"
    return current.state === "beendet" ? "beendet" : "geplant"
  }

  const priceLabel = () => {
    const current = resolved()
    if (current.phase) return dashCentsFormat(current.phase.priceCents)
    const first = p.ticketType.phases[0]
    return first ? dashCentsFormat(first.priceCents) : "—"
  }

  const hint = () =>
    endsHintText({
      endsReason: resolved().endsReason,
      endsAt: resolved().endsAt,
      remaining: resolved().remainingInPhase,
      now: p.now,
    })

  return (
    <article
      class={cn(
        "cursor-pointer rounded-card border border-border-subtle bg-surface p-4 transition-shadow hover:shadow-sm sm:p-5",
        p.isDragging && "opacity-50",
      )}
      onClick={p.onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          p.onOpen()
        }
      }}
      tabindex={0}
      role="button"
      aria-label={`Ticketart ${p.ticketType.name} öffnen`}
    >
      <div class="flex items-start gap-3">
        <Show when={p.canEdit}>
          <span
            role="button"
            tabindex={0}
            aria-label={`${p.ticketType.name} sortieren`}
            title="Zum Sortieren ziehen"
            class="mt-0.5 shrink-0 cursor-grab touch-none rounded-control p-1 text-content-muted hover:bg-surface-muted active:cursor-grabbing"
            draggable={p.dragHandleProps.draggable}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            onDragStart={p.dragHandleProps.onDragStart}
            onDragOver={p.dragHandleProps.onDragOver}
            onDrop={p.dragHandleProps.onDrop}
            onDragEnd={p.dragHandleProps.onDragEnd}
          >
            <Icon path={mdiDragVertical} class="size-5" />
          </span>
        </Show>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="truncate text-sm font-semibold text-content">{p.ticketType.name}</h3>
            <Show when={p.ticketType.hidden}>
              <span class="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-xs text-content-muted">
                <Icon path={mdiEyeOffOutline} class="size-3.5" />
                Versteckt
              </span>
            </Show>
            <Show when={p.ticketType.archivedAt !== null}>
              <span class="inline-flex items-center rounded-full bg-surface-muted px-2 py-0.5 text-xs text-content-muted">
                Archiviert
              </span>
            </Show>
          </div>
          <div class="mt-1 flex items-baseline justify-between gap-3">
            <DashMoney
              cents={resolved().phase?.priceCents ?? p.ticketType.phases[0]?.priceCents ?? 0}
              class="text-2xl font-semibold tabular-nums"
            />
            <span class="shrink-0 text-xs tabular-nums text-content-muted">
              {sales().sold} / {sales().capacity}
            </span>
          </div>
          <div class="mt-2">
            <ProgressBar
              value={sales().sold}
              max={Math.max(1, sales().capacity)}
              label={`${sales().sold} von ${sales().capacity} verkauft`}
            />
          </div>
          <Show when={p.ticketType.phases.length > 1}>
            <div class="mt-3 flex gap-1.5" aria-label="Preisphasen">
              <For each={p.ticketType.phases}>
                {(phase, index) => (
                  <div
                    class={cn(
                      "min-w-0 flex-1 rounded-control px-2 py-1.5 text-center",
                      phaseState(phase.id, index()) === "aktiv" && "bg-brand-soft text-brand ring-1 ring-brand/30",
                      phaseState(phase.id, index()) === "beendet" && "bg-surface-muted text-content-muted line-through",
                      phaseState(phase.id, index()) === "geplant" && "bg-surface-muted text-content",
                    )}
                  >
                    <p class="truncate text-xs font-medium">{phase.name}</p>
                    <p class="truncate text-xs tabular-nums">{dashCentsFormat(phase.priceCents)}</p>
                  </div>
                )}
              </For>
            </div>
          </Show>
          <Show when={hint()}>
            {(text) => (
              <p class="mt-1.5 text-xs text-content-muted">
                {text()} · {priceLabel()}
              </p>
            )}
          </Show>
        </div>
      </div>
    </article>
  )
}
