import * as v from "valibot"
import { createResult, createResultError, type Result } from "#result"
import {
  type OrganizerDashboardMigrationManifest,
  organizerDashboardMigrationManifestSchema,
} from "#src/organizer/dashboard/migration/organizerDashboardMigrationManifestSchema.ts"

/**
 * Validates an explicit local-test migration manifest against the exact
 * shared product schema. Pure: no I/O, no tokens, no PII.
 */
export function organizerDashboardMigrationRehearsalManifestCreate(
  input: unknown,
): Result<OrganizerDashboardMigrationManifest> {
  const op = "organizerDashboardMigrationRehearsalManifestCreate"
  const parsed = v.safeParse(organizerDashboardMigrationManifestSchema, input)
  if (!parsed.success) return createResultError(op, v.summarize(parsed.issues))
  return createResult(parsed.output)
}
