import { SelectSingle } from "#ui/input/select/SelectSingle.jsx"
import type { AdminTicketOrdersPageState } from "./AdminTicketOrdersPageState.ts"
import { adminTicketOrderStatusKeyOrder, type AdminTicketOrderStatusFilter } from "./adminTicketOrderStatusKey.ts"
import { adminTicketOrderStatusLabel } from "./adminTicketOrderStatusLabel.ts"

export function AdminTicketOrderStatusFilterSelect(props: {
  readonly state: AdminTicketOrdersPageState
  readonly compact?: boolean
}) {
  return (
    <SelectSingle
      class={props.compact ? "min-w-0" : "w-full sm:w-64"}
      buttonProps={{
        variant: "outline",
        size: "sm",
        class: props.compact
          ? "h-6 min-w-0 cursor-pointer justify-start truncate rounded-md border-content-muted/20 px-1.5 text-xs font-semibold"
          : "h-9 w-full justify-between",
        buttonChildren: props.compact ? <span class="truncate">Status</span> : undefined,
        type: "button",
      }}
      valueSignal={{
        get: props.state.statusFilter.get,
        set: (value) => props.state.statusFilter.set(value as AdminTicketOrderStatusFilter),
      }}
      getOptions={() =>
        (["alle", ...adminTicketOrderStatusKeyOrder] as const).map((value) => ({ type: "item", value }))
      }
      valueText={(filter) => `Status: ${adminTicketOrderStatusLabel(filter as AdminTicketOrderStatusFilter)}`}
      renderItem={(filter) =>
        `${adminTicketOrderStatusLabel(filter as AdminTicketOrderStatusFilter)} (${props.state.statusCounts()[filter as AdminTicketOrderStatusFilter]})`
      }
      innerClass="flex flex-col"
      listOptionClass="w-full"
    />
  )
}
