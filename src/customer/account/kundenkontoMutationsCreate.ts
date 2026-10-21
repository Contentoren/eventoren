import { api } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { mutationCreate } from "#src/utils/convex_client/mutationCreate.ts"

/** Binds the account profile mutation once during setup; token resolves live. */
export function kundenkontoMutationsCreate() {
  const profileRun = mutationCreate(api.customerAccount.customerAccountProfileUpdateMutation)
  return {
    updateProfile: (name: string) => profileRun({ name }),
  }
}

export type KundenkontoMutations = ReturnType<typeof kundenkontoMutationsCreate>
