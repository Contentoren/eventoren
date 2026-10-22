import { posthogConfigRead } from "./posthogConfigRead.ts"

let lastUserId: string | null | undefined

export async function posthogIdentityApply(userId: string | null): Promise<void> {
  if (typeof window === "undefined") return
  if (!window.__eventorenPosthogActive) return
  if (lastUserId === userId) return
  lastUserId = userId
  if (!posthogConfigRead().success) return
  const { posthog } = await import("posthog-js")
  if (userId === null) posthog.reset()
  else posthog.identify(userId)
}
