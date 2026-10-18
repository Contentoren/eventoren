import type { DashMember } from "../../model/dashMemberSchema.ts"

import { dashSeedTimeAt } from "./dashSeedTimeAt.ts"

export function dashSeedMembers(now: Date): DashMember[] {
  const invitedAt = dashSeedTimeAt(now, -3, "10:00")
  return [
    {
      id: "mem-mara-lindenhof",
      orgId: "org-lindenhof",
      userId: "user-mara",
      name: "Mara Lindner",
      email: "mara@kulturhaus-lindenhof.de",
      role: "inhaber",
      status: "aktiv",
      invitedAt: null,
    },
    {
      id: "mem-jonas-lindenhof",
      orgId: "org-lindenhof",
      userId: "user-jonas",
      name: "Jonas Weber",
      email: "jonas.weber@kulturhaus-lindenhof.de",
      role: "admin",
      status: "aktiv",
      invitedAt: null,
    },
    {
      id: "mem-aylin-lindenhof",
      orgId: "org-lindenhof",
      userId: "user-aylin",
      name: "Aylin Demir",
      email: "aylin.demir@kulturhaus-lindenhof.de",
      role: "finanzen",
      status: "aktiv",
      invitedAt: null,
    },
    {
      id: "mem-tim-lindenhof",
      orgId: "org-lindenhof",
      userId: null,
      name: "Tim Krüger",
      email: "tim.krueger@kulturhaus-lindenhof.de",
      role: "einlass",
      status: "eingeladen",
      invitedAt,
    },
    {
      id: "mem-mara-abikur",
      orgId: "org-abikur",
      userId: "user-mara",
      name: "Mara Lindner",
      email: "mara@kulturhaus-lindenhof.de",
      role: "eventmanager",
      status: "aktiv",
      invitedAt: null,
    },
    {
      id: "mem-lena-abikur",
      orgId: "org-abikur",
      userId: "user-lena",
      name: "Lena Vogt",
      email: "lena.vogt@abikur-ikg-2027.de",
      role: "inhaber",
      status: "aktiv",
      invitedAt: null,
    },
  ]
}
