import type { EventorenAuthIdentity } from "./EventorenAuthIdentity.ts"
import type { UserProfile } from "./UserProfile.ts"

export function eventorenAuthIdentityCreate(profile: UserProfile): EventorenAuthIdentity {
  return {
    userId: profile.userId,
    name: profile.name,
    ...(profile.username !== undefined && { username: profile.username }),
    ...(profile.image !== undefined && { image: profile.image }),
    ...(profile.email !== undefined && { email: profile.email }),
    role: profile.role,
    ...(profile.orgHandle !== undefined && { orgHandle: profile.orgHandle }),
    ...(profile.orgRole !== undefined && { orgRole: profile.orgRole }),
  }
}
