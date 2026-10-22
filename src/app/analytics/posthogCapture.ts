export async function posthogCapture(event: string, properties?: Record<string, string | number>): Promise<void> {
  if (typeof window === "undefined" || !window.__eventorenPosthogActive) return
  const { posthogConfigRead } = await import("./posthogConfigRead.ts")
  if (!posthogConfigRead().success) return
  const { posthog } = await import("posthog-js")
  posthog.capture(event, properties)
}
