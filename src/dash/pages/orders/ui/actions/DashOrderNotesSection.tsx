import { mdiTrashCanOutline } from "@adaptive-ds/mdi/mdiTrashCanOutline.js"
import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { Input } from "#ui/input/input/Input.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import type { DashNote } from "../../../../model/dashNoteSchema.ts"
import { DashRelativeTime } from "../../../../ui/time/DashRelativeTime.tsx"
import type { DashOrderNotesState } from "./dashOrderNotesStateCreate.ts"

/** Notizen-Block: Liste (Autor, relative Zeit, Löschen eigener) + Eingabe mit Enter-Submit. */
export function DashOrderNotesSection(p: {
  notes: DashNote[]
  sessionUserName: string | null
  state: DashOrderNotesState
  onAdd: (text: string) => void
  onDelete: (noteId: string, author: string) => void
}) {
  const submit = () => {
    const value = p.state.text.get().trim()
    if (value === "") return
    p.onAdd(value)
    p.state.text.set("")
  }

  return (
    <section aria-label="Notizen">
      <h2 class="text-sm font-semibold">Notizen · nur für dein Team sichtbar</h2>
      <Show when={p.notes.length > 0} fallback={<p class="mt-2 text-sm text-content-muted">Noch keine Notizen.</p>}>
        <ul class="mt-2 flex flex-col gap-2">
          <For each={p.notes}>
            {(note) => (
              <li class="border border-border-subtle rounded-control px-3 py-2 text-sm">
                <div class="flex items-start justify-between gap-2">
                  <p class="min-w-0 flex-1">{note.text}</p>
                  <Show when={p.sessionUserName !== null && note.author === p.sessionUserName}>
                    <Button
                      type="button"
                      variant={buttonVariant.ghost}
                      class="h-7 shrink-0 px-2 text-xs"
                      aria-label={`Notiz von ${note.author} löschen`}
                      title="Notiz löschen"
                      onClick={() => p.onDelete(note.id, note.author)}
                    >
                      <Icon path={mdiTrashCanOutline} class="size-4" />
                    </Button>
                  </Show>
                </div>
                <p class="mt-1 text-xs text-content-muted">
                  {note.author} · <DashRelativeTime iso={note.at} />
                </p>
              </li>
            )}
          </For>
        </ul>
      </Show>
      <div class="mt-2 flex gap-2">
        <Input
          value={p.state.text.get()}
          onInput={(event) => p.state.text.set(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit()
          }}
          placeholder="Notiz hinzufügen …"
          aria-label="Notiz hinzufügen"
          class="h-9 flex-1 text-sm rounded-control"
        />
        <Button
          type="button"
          variant={buttonVariant.outline}
          class="h-9 shrink-0 px-3 text-sm"
          disabled={p.state.text.get().trim() === ""}
          onClick={submit}
        >
          Notiz hinzufügen
        </Button>
      </div>
    </section>
  )
}
