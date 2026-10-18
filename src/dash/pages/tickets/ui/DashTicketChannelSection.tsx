import { For, Show } from "solid-js"
import { useNavigate } from "@tanstack/solid-router"
import { mdiPlus } from "@adaptive-ds/mdi/mdiPlus.js"
import { mdiTicketOutline } from "@adaptive-ds/mdi/mdiTicketOutline.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import type { DashTicketChannel } from "../../../model/dashTicketChannelSchema.ts"
import type { DashTicketType } from "../../../model/dashTicketTypeSchema.ts"
import type { DashOrder } from "../../../model/dashOrderSchema.ts"
import type { DashTicket } from "../../../model/dashTicketSchema.ts"
import type { DashTicketsState } from "../DashTicketsStateCreate.ts"
import { dashTicketTypeReorder } from "../../../store/actions/dashTicketTypeReorder.ts"
import { DashTicketCard } from "./DashTicketCard.tsx"

function channelCards(args: {
  channel: DashTicketChannel
  types: DashTicketType[]
  orders: DashOrder[]
  tickets: DashTicket[]
  now: Date
  canEdit: boolean
  state: DashTicketsState
  onOpen: (id: string) => void
  onReordered: () => void
}): DashTicketType[] {
  return args.types.filter((type) => type.channel === args.channel && type.archivedAt === null)
}

function handleDrop(args: {
  domEvent: DragEvent
  eventId: string
  targetId: string
  state: DashTicketsState
  ordered: DashTicketType[]
  onReordered: () => void
}) {
  args.domEvent.preventDefault()
  const dragged = args.state.dragId.get()
  args.state.dragId.set(null)
  if (!dragged || dragged === args.targetId) return
  const ids = args.ordered.map((type) => type.id)
  const from = ids.indexOf(dragged)
  const to = ids.indexOf(args.targetId)
  if (from < 0 || to < 0) return
  ids.splice(to, 0, ...ids.splice(from, 1))
  // Reorder läuft über alle Typen des Events; Typen anderer Kanäle behalten ihre relative Position.
  void args.onReordered()
  const result = dashTicketTypeReorder(args.eventId, ids)
  if (!result.success) args.onReordered()
}

/** Sektion Online/Abendkasse mit sortierbaren Ticketart-Karten. */
export function DashTicketChannelSection(p: {
  eventId: string
  channel: DashTicketChannel
  title: string
  types: DashTicketType[]
  orders: DashOrder[]
  tickets: DashTicket[]
  now: Date
  canEdit: boolean
  state: DashTicketsState
  onOpen: (id: string) => void
  onCreate: () => void
  onReordered: () => void
}) {
  const cards = () =>
    channelCards({
      channel: p.channel,
      types: p.types,
      orders: p.orders,
      tickets: p.tickets,
      now: p.now,
      canEdit: p.canEdit,
      state: p.state,
      onOpen: p.onOpen,
      onReordered: p.onReordered,
    })
  const navigate = useNavigate()

  return (
    <DashSection
      title={p.title}
      actions={
        <Show when={p.canEdit && p.channel === "online"}>
          <Button type="button" variant="outline" class="h-8 px-2.5 text-sm" onClick={p.onCreate}>
            <Icon path={mdiPlus} class="size-4" />
            Ticketart hinzufügen
          </Button>
        </Show>
      }
    >
      <Show
        when={cards().length > 0}
        fallback={
          <Show
            when={p.channel === "abendkasse"}
            fallback={
              <EmptyState
                icon={mdiTicketOutline}
                title="Noch keine Ticketarten"
                description="Lege deine erste Ticketart an."
                size="sm"
                actions={
                  <Show when={p.canEdit}>
                    <Button type="button" variant="contrast" class="h-9 px-3 text-sm" onClick={p.onCreate}>
                      <Icon path={mdiPlus} class="size-4" />
                      Ticketart hinzufügen
                    </Button>
                  </Show>
                }
              />
            }
          >
            <EmptyState
              icon={mdiTicketOutline}
              title="Keine Preise für die Abendkasse"
              description="Lege Preise für die Abendkasse fest"
              size="sm"
              actions={
                <>
                  <Show when={p.canEdit}>
                    <Button type="button" variant="contrast" class="h-9 px-3 text-sm" onClick={p.onCreate}>
                      <Icon path={mdiPlus} class="size-4" />
                      Abendkassenpreis anlegen
                    </Button>
                  </Show>
                  <LinkButtonInternal
                    to={`/demo/dashboard/events/${p.eventId}/abendkasse`}
                    variant="outline"
                    size="sm"
                    class="h-9 px-3 text-sm"
                  >
                    Zur Abendkasse
                  </LinkButtonInternal>
                </>
              }
            />
          </Show>
        }
      >
        <div class="flex flex-col gap-3">
          <For each={cards()}>
            {(type) => (
              <DashTicketCard
                ticketType={type}
                orders={p.orders}
                tickets={p.tickets}
                now={p.now}
                canEdit={p.canEdit}
                onOpen={() => p.onOpen(type.id)}
                isDragging={p.state.dragId.get() === type.id}
                dragHandleProps={{
                  draggable: p.canEdit,
                  onDragStart: (event) => {
                    p.state.dragId.set(type.id)
                    event.dataTransfer?.setData("text/plain", type.id)
                  },
                  onDragOver: (event) => {
                    if (p.state.dragId.get() !== null) event.preventDefault()
                  },
                  onDrop: (domEvent) =>
                    handleDrop({
                      domEvent,
                      eventId: p.eventId,
                      targetId: type.id,
                      state: p.state,
                      ordered: cards(),
                      onReordered: p.onReordered,
                    }),
                  onDragEnd: () => p.state.dragId.set(null),
                }}
              />
            )}
          </For>
          <Show when={p.channel === "abendkasse"}>
            <div>
              <LinkButtonInternal
                to={`/demo/dashboard/events/${p.eventId}/abendkasse`}
                variant="outline"
                size="sm"
                class="h-9 px-3 text-sm"
              >
                Zur Abendkasse
              </LinkButtonInternal>
            </div>
          </Show>
        </div>
      </Show>
    </DashSection>
  )
}
