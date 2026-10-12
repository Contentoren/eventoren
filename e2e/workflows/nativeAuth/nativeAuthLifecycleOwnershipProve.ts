import { createResult, createResultError, type Result } from "#result"

export type NativeAuthLifecycleOwnershipProbe = Result<
  { adopted: true; edited: boolean; status: string } | { adopted: false }
>

/**
 * Reconcile an exact event-key lookup (admin pages include archived rows)
 * against the same-run stable identity before creating a replacement. An
 * uncertain create adopts the existing draft, including an archived one, when
 * its title is still one of this run's own titles. A title that no longer
 * carries this run's marker refuses adoption for manual reconciliation. Absent
 * rows are not an error: the caller creates the draft.
 */
export function nativeAuthLifecycleOwnershipProve(
  found: { eventKey: string; title: string; status: string } | undefined,
  identity: { eventKey: string; initialTitle: string; editedTitle: string },
): NativeAuthLifecycleOwnershipProbe {
  const op = "nativeAuthLifecycleOwnershipProve"
  if (!found) return createResult({ adopted: false as const })
  if (found.eventKey !== identity.eventKey) {
    return createResultError(op, "Exact lifecycle event key does not match the run; reconcile it manually")
  }
  if (found.title !== identity.initialTitle && found.title !== identity.editedTitle) {
    return createResultError(op, "Lifecycle draft no longer carries this run's marker; reconcile it manually")
  }
  return createResult({ adopted: true as const, edited: found.title === identity.editedTitle, status: found.status })
}
