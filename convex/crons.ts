import { cronJobs } from "convex/server"
import { internal } from "./_generated/api.js"

const crons = cronJobs()

crons.interval(
  "synchronize Zitadel roles",
  { minutes: 5 },
  internal.auth.authZitadelRolesSynchronizeScheduledAction,
  {},
)

crons.interval(
  "reconcile ticket payments and fulfillment",
  { minutes: 5 },
  internal.ticketing.ticketPaymentReconcileScheduledAction,
  {},
)

crons.interval(
  "prepare ticket fulfillment",
  { minutes: 5 },
  internal.ticketing.ticketFulfillmentWorkScheduledAction,
  {},
)

crons.interval(
  "send due organizer messages and reminders",
  { minutes: 15 },
  internal.organizerDashboardMessages.organizerDashboardMessageDueSendMutation,
  {},
)

export default crons
