import { Button } from "#ui/interactive/button/Button.jsx"
import type { AdminListViewPreference } from "./adminListViewPreferenceContext.ts"

export function AdminListViewControl(props: { readonly preference: AdminListViewPreference }) {
  return (
    <fieldset class="m-0 flex min-w-0 gap-1 border-0 p-0">
      <legend class="sr-only">Ansicht der Listen</legend>
      <Button
        type="button"
        variant={props.preference.view() === "list" ? "subtle" : "ghost"}
        aria-pressed={props.preference.view() === "list"}
        class="flex-1"
        onClick={() => props.preference.selectView("list")}
      >
        Liste
      </Button>
      <Button
        type="button"
        variant={props.preference.view() === "tiles" ? "subtle" : "ghost"}
        aria-pressed={props.preference.view() === "tiles"}
        class="flex-1"
        onClick={() => props.preference.selectView("tiles")}
      >
        Kacheln
      </Button>
    </fieldset>
  )
}
