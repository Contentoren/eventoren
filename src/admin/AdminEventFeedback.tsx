import { Show } from "solid-js"
import type { AdminCatalogPageState } from "./AdminCatalogPageState.ts"

export function AdminEventFeedback(props: { state: AdminCatalogPageState }) {
  return (
    <>
      <Show when={props.state.errorMessage()}>
        <p
          role="alert"
          class="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200"
        >
          {props.state.errorMessage()}
        </p>
      </Show>
      <Show when={props.state.successMessage()}>
        <p
          role="status"
          class="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-700 dark:bg-green-950/40 dark:text-green-200"
        >
          {props.state.successMessage()}
        </p>
      </Show>
    </>
  )
}
