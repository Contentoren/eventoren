import type { Accessor } from "solid-js"
import type { AdminZitadelMember } from "./AdminZitadelMember.ts"

export type AdminOrganizerMembersPageState = {
  readonly contact: (member: AdminZitadelMember) => string
  readonly errorMessage: Accessor<string>
  readonly hasLoaded: Accessor<boolean>
  readonly invitationFormat: (timestamp: string | undefined) => string
  readonly isLoading: Accessor<boolean>
  readonly members: Accessor<readonly AdminZitadelMember[]>
  readonly reload: () => Promise<void>
}
