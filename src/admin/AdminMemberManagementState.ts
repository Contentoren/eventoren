import type { Accessor } from "solid-js"
import type { AdminZitadelMember } from "./AdminZitadelMember.ts"
import type { adminMemberManagementText } from "./adminMemberManagementText.ts"

export type AdminMemberManagementState = {
  readonly errorMessage: Accessor<string>
  readonly hasLoaded: Accessor<boolean>
  readonly invitationFormat: (timestamp: string | undefined) => string
  readonly isLoading: Accessor<boolean>
  readonly isUpdating: (zitadelUserId: string) => boolean
  readonly members: Accessor<readonly AdminZitadelMember[]>
  readonly roleFilter: Accessor<readonly ("admin" | "organizer")[]>
  readonly roleFilterToggle: (role: "admin" | "organizer") => void
  readonly reload: () => Promise<void>
  readonly roleChange: (member: AdminZitadelMember) => Promise<void>
  readonly search: Accessor<string>
  readonly searchChange: (value: string) => void
  readonly searchSubmit: () => Promise<void>
  readonly successMessage: Accessor<string>
  readonly text: Accessor<ReturnType<typeof adminMemberManagementText>>
  readonly total: Accessor<number>
}
