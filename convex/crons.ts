import { cronJobs } from "convex/server"
import { internal } from "./_generated/api.js"

const crons = cronJobs()

crons.interval(
  "synchronize Zitadel roles",
  { minutes: 5 },
  internal.auth.authZitadelRolesSynchronizeScheduledAction,
  {},
)

export default crons
