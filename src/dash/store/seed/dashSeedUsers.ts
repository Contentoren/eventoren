import type { DashUser } from "../../model/dashUserSchema.ts"

export function dashSeedUsers(): DashUser[] {
  return [
    { id: "user-mara", name: "Mara Lindner", email: "mara@kulturhaus-lindenhof.de" },
    { id: "user-jonas", name: "Jonas Weber", email: "jonas.weber@kulturhaus-lindenhof.de" },
    { id: "user-aylin", name: "Aylin Demir", email: "aylin.demir@kulturhaus-lindenhof.de" },
    { id: "user-lena", name: "Lena Vogt", email: "lena.vogt@abikur-ikg-2027.de" },
    { id: "user-lea", name: "Lea Schneider", email: "lea.schneider@example.de" },
  ]
}
