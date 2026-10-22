import type { Accessor } from "solid-js"
import type { ZitadelRole } from "#src/auth/model_field/zitadelRole.ts"
import type { SignalObject } from "#ui/utils/createSignalObject.js"
import type { AdminZitadelMember } from "./AdminZitadelMember.ts"
import type { adminMemberManagementText } from "./adminMemberManagementText.ts"

export type AdminMemberManagementState = {
  readonly availableRoles: Accessor<readonly ZitadelRole[]>
  readonly closeEdit: () => void
  readonly draftRoles: SignalObject<ZitadelRole[]>
  readonly editingMember: Accessor<AdminZitadelMember | undefined>
  readonly errorMessage: Accessor<string>
  readonly hasLoaded: Accessor<boolean>
  readonly invitationFormat: (timestamp: string | undefined) => string
  readonly isLoading: Accessor<boolean>
  readonly isUpdating: (zitadelUserId: string) => boolean
  readonly members: Accessor<readonly AdminZitadelMember[]>
  readonly openEdit: (member: AdminZitadelMember) => void
  readonly roleFilter: SignalObject<RoleFilter>
  readonly reload: () => Promise<void>
  readonly saveRoles: () => Promise<void>
  readonly search: Accessor<string>
  readonly searchChange: (value: string) => void
  readonly searchSubmit: () => Promise<void>
  readonly successMessage: Accessor<string>
  readonly text: Accessor<ReturnType<typeof adminMemberManagementText>>
  readonly total: Accessor<number>
}

export type AdminMemberRoleFilter = RoleFilter
type RoleFilter = "all" | ZitadelRole
