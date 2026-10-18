import { Show } from "solid-js"
import { mdiDeleteOutline } from "@adaptive-ds/mdi/mdiDeleteOutline.js"
import { mdiDotsVertical } from "@adaptive-ds/mdi/mdiDotsVertical.js"
import { Avatar } from "#ui/static/avatar/Avatar.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { DataTable } from "#ui/table/data/DataTable.jsx"
import type { DataTableColumn } from "#ui/table/data/DataTableColumn.js"
import { DropdownMenu } from "#ui/interactive/menu/DropdownMenu.jsx"
import { SelectSingleNative } from "#ui/input/select/SelectSingleNative.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { createSignalObject } from "#ui/utils/createSignalObject.js"

import type { DashMember } from "../../../model/dashMemberSchema.ts"
import { dashRoleLabel } from "../../../model/dashRoleLabel.ts"
import type { DashRole } from "../../../model/dashRoleSchema.ts"
import { DashRelativeTime } from "../../../ui/time/DashRelativeTime.tsx"
import { DashStatusPill } from "../../../ui/status/DashStatusPill.tsx"
import type { DashTeamPageState } from "../dashTeamPageStateCreate.ts"

const dashTeamRoles: DashRole[] = ["inhaber", "admin", "eventmanager", "finanzen", "einlass"]

function DashTeamRoleCell(p: { member: DashMember; state: DashTeamPageState }) {
  const meta = () => dashRoleLabel(p.member.role)
  const canChange = () => p.state.canManage() && !(p.member.role === "inhaber" && p.state.ownerCount() <= 1)
  const value = createSignalObject<DashRole>(p.member.role)
  const options = () => dashTeamRoles.map((role) => dashRoleLabel(role).label)
  const labelToRole = (label: string): DashRole =>
    dashTeamRoles.find((role) => dashRoleLabel(role).label === label) ?? p.member.role

  return (
    <Show
      when={canChange()}
      fallback={
        <span class="inline-flex items-center gap-1.5 text-sm">
          <Icon path={meta().icon} class="size-4 shrink-0 text-content-muted" />
          {meta().label}
        </span>
      }
    >
      <span onClick={(event) => event.stopPropagation()}>
        <SelectSingleNative
          valueSignal={{
            get: () => meta().label,
            set: (label) => {
              const next = labelToRole(label)
              value.set(next)
              if (next !== p.member.role) p.state.changeRole(p.member, next)
            },
          }}
          getOptions={options}
        />
      </span>
    </Show>
  )
}

/** Team-Tabelle: Avatar + Name („Du“-Chip), E-Mail, Rolle (inline), Status, ⋯-Menü. */
export function DashTeamTable(p: { state: DashTeamPageState }) {
  const columns = (): DataTableColumn<DashMember>[] => [
    {
      id: "name",
      header: "Name",
      cell: (row) => (
        <span class="flex min-w-0 items-center gap-2.5">
          <Avatar name={row.name} size="sm" />
          <span class="flex min-w-0 flex-col">
            <span class="flex items-center gap-1.5">
              <span class="truncate font-medium">{row.name}</span>
              <Show when={row.userId !== null && row.userId === p.state.sessionUserId()}>
                <span class="shrink-0 rounded-full bg-surface-muted px-1.5 py-0.5 text-[11px] font-medium text-content-muted">
                  Du
                </span>
              </Show>
            </span>
            <span class="truncate text-xs text-content-muted sm:hidden">{row.email}</span>
          </span>
        </span>
      ),
      sortValue: (row) => row.name,
    },
    {
      id: "email",
      header: "E-Mail",
      cell: (row) => <span class="truncate text-sm text-content-muted">{row.email}</span>,
      sortValue: (row) => row.email,
      hideBelow: "sm",
    },
    {
      id: "rolle",
      header: "Rolle",
      cell: (row) => <DashTeamRoleCell member={row} state={p.state} />,
      sortValue: (row) => dashRoleLabel(row.role).label,
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <span class="flex min-w-0 flex-col gap-1">
          <DashStatusPill kind="member" value={row.status} />
          <Show when={row.status === "eingeladen" && row.invitedAt !== null}>
            <span class="flex items-center gap-1 text-xs text-content-muted">
              <span>
                Eingeladen · <DashRelativeTime iso={row.invitedAt ?? ""} />
              </span>
              <Show when={p.state.canManage()}>
                <Button
                  variant="link"
                  class="h-auto p-0 text-xs font-medium"
                  onClick={(event) => {
                    event.stopPropagation()
                    p.state.resend(row)
                  }}
                >
                  Erneut senden
                </Button>
              </Show>
            </span>
          </Show>
        </span>
      ),
      sortValue: (row) => row.status,
      hideBelow: "md",
    },
    {
      id: "menu",
      header: "",
      cell: (row) => (
        <Show when={p.state.canManage()} fallback={<span class="text-content-muted">–</span>}>
          <span onClick={(event) => event.stopPropagation()}>
            <DropdownMenu
              items={[
                {
                  type: "item",
                  id: "entfernen",
                  label: "Entfernen",
                  icon: mdiDeleteOutline,
                  tone: "danger",
                  onSelect: () => p.state.removeTarget.set(row),
                },
              ]}
              triggerIcon={mdiDotsVertical}
              triggerAriaLabel={`${row.name} entfernen`}
            />
          </span>
        </Show>
      ),
      align: "right",
    },
  ]

  return (
    <DataTable
      rows={p.state.members()}
      rowKey={(row) => row.id}
      columns={columns()}
      ariaLabel="Teammitglieder"
      mobileCard={(row) => (
        <div class="flex flex-col gap-2 text-sm">
          <div class="flex items-center gap-2.5">
            <Avatar name={row.name} size="sm" />
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5">
                <span class="truncate font-medium">{row.name}</span>
                <Show when={row.userId !== null && row.userId === p.state.sessionUserId()}>
                  <span class="shrink-0 rounded-full bg-surface-muted px-1.5 py-0.5 text-[11px] font-medium text-content-muted">
                    Du
                  </span>
                </Show>
              </div>
              <div class="truncate text-xs text-content-muted">{row.email}</div>
            </div>
            <DashStatusPill kind="member" value={row.status} size="sm" />
          </div>
          <div class="flex items-center justify-between gap-2">
            <DashTeamRoleCell member={row} state={p.state} />
            <Show when={p.state.canManage()}>
              <span onClick={(event) => event.stopPropagation()}>
                <DropdownMenu
                  items={[
                    {
                      type: "item",
                      id: "entfernen",
                      label: "Entfernen",
                      icon: mdiDeleteOutline,
                      tone: "danger",
                      onSelect: () => p.state.removeTarget.set(row),
                    },
                  ]}
                  triggerIcon={mdiDotsVertical}
                  triggerAriaLabel={`${row.name} entfernen`}
                />
              </span>
            </Show>
          </div>
          <Show when={row.status === "eingeladen" && row.invitedAt !== null && p.state.canManage()}>
            <Button
              variant="link"
              class="h-auto self-start p-0 text-xs font-medium"
              onClick={() => p.state.resend(row)}
            >
              Erneut senden
            </Button>
          </Show>
        </div>
      )}
      empty={<span class="text-sm text-content-muted">Noch keine Mitglieder – lade dein Team ein.</span>}
    />
  )
}
