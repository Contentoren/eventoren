import type { UserProfile } from "./UserProfile.ts"

export type EventorenAuthIdentity = Pick<
  UserProfile,
  "userId" | "name" | "username" | "image" | "email" | "role" | "orgHandle" | "orgRole"
>
