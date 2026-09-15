export type AdminZitadelMember = {
  readonly displayName: string
  readonly email?: string
  readonly eventorenRole?: "user" | "customer" | "organizer" | "admin" | "dev"
  readonly eventorenUserId?: string
  readonly organizerGranted: boolean
  readonly organizerInvitedAt?: string
  readonly preferredLoginName?: string
  readonly userName: string
  readonly zitadelRoles: readonly ("customer" | "organizer" | "admin")[]
  readonly zitadelUserId: string
}
