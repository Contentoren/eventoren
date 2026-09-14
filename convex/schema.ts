import { defineSchema } from "convex/server"
import { authTables } from "#src/auth/convex/authTables.ts"
import { catalogTables } from "#src/catalog/convex/catalogTables.ts"
import { fileTables } from "#src/file/convex/fileTables.ts"
import { orgInvitationTables } from "#src/org/invitation_convex/orgInvitationTables.ts"
import { orgMemberTables } from "#src/org/member_convex/orgMemberTables.ts"
import { orgTables } from "#src/org/org_convex/orgTables.ts"
import { ticketTables } from "#src/ticketing/convex/ticketTables.ts"

const schema = defineSchema({
  ...authTables,
  ...orgTables,
  ...orgInvitationTables,
  ...orgMemberTables,
  ...fileTables,
  ...catalogTables,
  ...ticketTables,
})

export default schema
