import type { AdminZitadelMember } from "../../admin/AdminZitadelMember.ts"

export const demoAdminMembers: readonly AdminZitadelMember[] = [
  {
    displayName: "Mara König",
    email: "mara.koenig@example.test",
    eventorenRole: "organizer",
    eventorenUserId: "demo-eventoren-mara",
    organizerGranted: true,
    organizerInvitedAt: "2026-09-08T10:15:00.000Z",
    preferredLoginName: "mara.koenig",
    userName: "mara.koenig",
    zitadelRoles: ["customer", "organizer"],
    zitadelUserId: "demo-zitadel-mara",
  },
  {
    displayName: "Jonas Weber",
    email: "jonas.weber@example.test",
    eventorenRole: "customer",
    eventorenUserId: "demo-eventoren-jonas",
    organizerGranted: false,
    organizerInvitedAt: "2026-09-12T14:30:00.000Z",
    preferredLoginName: "jonas.weber",
    userName: "jonas.weber",
    zitadelRoles: ["customer"],
    zitadelUserId: "demo-zitadel-jonas",
  },
  {
    displayName: "Eventoren Support",
    email: "support@example.test",
    eventorenRole: "admin",
    organizerGranted: true,
    preferredLoginName: "support",
    userName: "support",
    zitadelRoles: ["admin", "organizer"],
    zitadelUserId: "demo-zitadel-support",
  },
]
