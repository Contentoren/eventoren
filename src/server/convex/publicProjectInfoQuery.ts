import { query } from "#convex/_generated/server.js"

export const publicProjectInfoQuery = query({
  args: {},
  handler: async () => ({
    projectName: "eventoren",
    serverTimestamp: Date.now(),
  }),
})
