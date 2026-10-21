import { defineSchema } from "convex/server"
import { authTables } from "#src/auth/convex/authTables.ts"
import { catalogTables } from "#src/catalog/convex/catalogTables.ts"
import { fileTables } from "#src/file/convex/fileTables.ts"
import { orgInvitationTables } from "#src/org/invitation_convex/orgInvitationTables.ts"
import { orgMemberTables } from "#src/org/member_convex/orgMemberTables.ts"
import { orgTables } from "#src/org/org_convex/orgTables.ts"
import { scannerLinkTables } from "#src/organizer/convex/scannerLinkTables.ts"
import { organizerContractTables } from "#src/organizer/dashboard/contracts/organizerContractTables.ts"
import { organizerDashboardTables } from "#src/organizer/dashboard/convex/organizerDashboardTables.ts"
import { organizerDashboardFinanceTables } from "#src/organizer/dashboard/finance/convex/organizerDashboardFinanceTables.ts"
import { organizerDashboardOrderTables } from "#src/organizer/dashboard/orders/convex/organizerDashboardOrderTables.ts"
import { organizerDashboardPricingTables } from "#src/organizer/dashboard/pricing/organizerDashboardPricingTables.ts"
import { organizerDashboardGuestTables } from "#src/organizer/dashboard/guests/organizerDashboardGuestTables.ts"
import { organizerDashboardMessageTables } from "#src/organizer/dashboard/messages/organizerDashboardMessageTables.ts"
import { organizerDashboardTeamTables } from "#src/organizer/dashboard/team/organizerDashboardTeamTables.ts"
import { ticketTables } from "#src/ticketing/convex/ticketTables.ts"

const schema = defineSchema({
  ...authTables,
  ...orgTables,
  ...orgInvitationTables,
  ...orgMemberTables,
  ...fileTables,
  ...catalogTables,
  ...ticketTables,
  ...scannerLinkTables,
  ...organizerDashboardTables,
  ...organizerDashboardFinanceTables,
  ...organizerDashboardOrderTables,
  ...organizerDashboardPricingTables,
  ...organizerDashboardGuestTables,
  ...organizerDashboardMessageTables,
  ...organizerDashboardTeamTables,
  ...organizerContractTables,
})

export default schema
