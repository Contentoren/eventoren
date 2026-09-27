import { Show } from "solid-js"
import type { AdminCatalogPageState } from "./AdminCatalogPageState.ts"

export function AdminEventFeedback(props: { state: AdminCatalogPageState }) {
  return (
    <>
      <Show when={props.state.errorMessage()}>
        <p role="alert" class="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {props.state.errorMessage()}
        </p>
      </Show>
      <Show when={props.state.successMessage()}>
        <p role="status" class="rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
          {props.state.successMessage()}
        </p>
      </Show>
    </>
  )
}
