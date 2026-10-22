import { posthogConfigRead } from "./posthogConfigRead.ts"

declare global {
  interface Window {
    __eventorenPosthogActive?: boolean
  }
}

let initialized = false

export async function posthogInit(): Promise<void> {
  if (typeof window === "undefined" || initialized) return
  const config = posthogConfigRead()
  if (!config.success) return
  initialized = true
  const { posthog } = await import("posthog-js")
  posthog.init(config.data.appId, {
    api_host: config.data.apiHost,
    ui_host: config.data.uiHost,
    autocapture: false,
    capture_pageview: false,
    disable_session_recording: false,
    enable_recording_console_log: true,
    session_recording: { maskAllInputs: true, maskInputOptions: { password: true } },
    advanced_disable_feature_flags_on_first_load: true,
    advanced_disable_feature_flags: true,
    persistence: "localStorage",
  })
  window.__eventorenPosthogActive = true
  posthog.capture("$pageview")
}
