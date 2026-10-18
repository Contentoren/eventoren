import { For } from "solid-js"
import { mdiChevronRight } from "@adaptive-ds/mdi/mdiChevronRight.js"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import type { DashOverviewTodo } from "../model/dashOverviewTodosCreate.ts"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"

export function DashOverviewTodos(p: { todos: DashOverviewTodo[] }) {
  return (
    <DashSection title="To-dos">
      <ul class="flex flex-col">
        <For each={p.todos}>
          {(todo) => (
            <li class="border-b border-border-subtle last:border-0">
              <LinkButtonInternal
                to={todo.href}
                variant="ghost"
                class="h-auto w-full justify-between gap-2 px-2 py-2.5 text-left text-sm"
              >
                <span class="min-w-0 flex-1 truncate text-content">{todo.title}</span>
                <Icon path={mdiChevronRight} class="size-4 shrink-0 text-content-muted" />
              </LinkButtonInternal>
            </li>
          )}
        </For>
      </ul>
    </DashSection>
  )
}
