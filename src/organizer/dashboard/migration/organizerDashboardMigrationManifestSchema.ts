import * as v from "valibot"
import { organizerDashboardOrganizationKindSchema } from "#src/organizer/dashboard/model/organizerDashboardOrganizationKindSchema.ts"
import { organizerDashboardRoleSchema } from "#src/organizer/dashboard/model/organizerDashboardRoleSchema.ts"

/**
 * Explicit legacy migration manifest. Every assignment names an existing
 * canonical ID; nothing is inferred from organizer display names or the
 * global organizer role. Total assignments are bounded to 25 per apply.
 *
 * Scanner link approvals are optional explicit admin reapprovals: when an
 * event becomes owned, existing unbound Bearer [REDACTED] links for it stop working
 * until each (link, event) pair is approved here into the post-manifest
 * owner. Helper links additionally need their parent approved.
 */
export const organizerDashboardMigrationManifestSchema = v.strictObject({
  orgInits: v.array(
    v.strictObject({
      orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty")),
      kind: organizerDashboardOrganizationKindSchema,
    }),
  ),
  eventAssignments: v.array(
    v.strictObject({
      eventKey: v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty")),
      orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty")),
    }),
  ),
  roleAssignments: v.array(
    v.strictObject({
      userId: v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty")),
      orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty")),
      role: organizerDashboardRoleSchema,
    }),
  ),
  scannerLinkApprovals: v.optional(
    v.array(
      v.strictObject({
        linkId: v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty")),
        eventKey: v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty")),
        orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty")),
      }),
    ),
    [],
  ),
})

export type OrganizerDashboardMigrationManifest = v.InferOutput<typeof organizerDashboardMigrationManifestSchema>
