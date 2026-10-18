import { dashNow } from "#src/dash/store/dashNow.ts"
import { dashDateFormat } from "#src/dash/model/dashDateFormat.ts"
import { dashRelativeTimeFormat } from "#src/dash/model/dashRelativeTimeFormat.ts"

export function dashRelativeTimeStateCreate(inputs: { iso: () => string }) {
  const now = dashNow()
  const relative = () => dashRelativeTimeFormat(inputs.iso(), now())
  const title = () => dashDateFormat(inputs.iso(), "lang")

  return { relative, title }
}

export type DashRelativeTimeState = ReturnType<typeof dashRelativeTimeStateCreate>

export function DashRelativeTime(props: { iso: string; class?: string }) {
  const state = dashRelativeTimeStateCreate({ iso: () => props.iso })

  return (
    <time datetime={props.iso} title={state.title()} class={props.class}>
      {state.relative()}
    </time>
  )
}
