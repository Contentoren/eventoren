import { query } from "./_generated/server.js"

export const publicProjectInfo = query({
  args: {},
  handler: async () => ({
    projectName: "eventoren",
    serverTimestamp: Date.now(),
  }),
})
