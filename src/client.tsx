import { hydrateStart, StartClient } from "@tanstack/solid-start/client"
import { hydrate } from "solid-js/web"

if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    console.error("Unhandled client error:", event.error ?? event.message)
  })
  window.addEventListener("unhandledrejection", (event) => {
    console.error("Unhandled promise rejection:", event.reason)
  })
}

hydrateStart().then((router) => {
  hydrate(() => <StartClient router={router} />, document)
})
