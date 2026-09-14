import { Button } from "#ui/interactive/button/Button.jsx"
import { For, Show } from "solid-js"
import { DemoShell } from "./DemoShell.js"
import { demoXyzStateCreate } from "./demoXyzStateCreate.js"

const tasks = [
  { id: "brief", title: "Review the welcome brief", owner: "Mina" },
  { id: "prototype", title: "Sketch the first prototype", owner: "Jon" },
  { id: "handoff", title: "Prepare the handoff", owner: "Ravi" },
] as const

export function DemoXyz() {
  const state = demoXyzStateCreate()

  return (
    <DemoShell currentId="xyz">
      <section
        aria-labelledby="workspace-title"
        class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p class="text-sm font-semibold uppercase tracking-wide text-indigo-600">Workspace pulse</p>
            <h1 id="workspace-title" class="mt-2 text-3xl font-bold tracking-tight">
              Project Aurora
            </h1>
            <p class="mt-3 text-slate-600">A small project workspace powered by local fixture state.</p>
          </div>
          <span class="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">On track</span>
        </div>

        <div class="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Workspace views">
          <Button
            type="button"
            variant="outline"
            class=""
            aria-pressed={state.view() === "overview"}
            onClick={() => state.viewChoose("overview")}
          >
            Overview
          </Button>
          <Button
            type="button"
            variant="outline"
            class=""
            aria-pressed={state.view() === "activity"}
            onClick={() => state.viewChoose("activity")}
          >
            Activity
          </Button>
        </div>

        <Show
          when={state.view() === "overview"}
          fallback={
            <div class="mt-8 rounded-lg bg-slate-50 p-5">
              <h2 class="font-semibold">Recent activity</h2>
              <ol class="mt-4 space-y-3 text-sm text-slate-600">
                <li>
                  <strong class="text-slate-900">Mina</strong> reviewed the welcome brief.
                </li>
                <li>
                  <strong class="text-slate-900">Jon</strong> opened the prototype board.
                </li>
                <li>
                  <strong class="text-slate-900">Ravi</strong> joined the project workspace.
                </li>
              </ol>
            </div>
          }
        >
          <div class="mt-8 grid gap-4 sm:grid-cols-3">
            <div class="rounded-lg bg-indigo-50 p-4">
              <p class="text-sm text-indigo-700">Completion</p>
              <p class="mt-1 text-2xl font-bold">
                {state.completedTaskCount().length}/{tasks.length}
              </p>
            </div>
            <div class="rounded-lg bg-amber-50 p-4">
              <p class="text-sm text-amber-700">Next milestone</p>
              <p class="mt-1 font-semibold">Prototype review</p>
            </div>
            <div class="rounded-lg bg-emerald-50 p-4">
              <p class="text-sm text-emerald-700">Due</p>
              <p class="mt-1 font-semibold">Friday, 16:00</p>
            </div>
          </div>
          <div class="mt-8">
            <div class="flex items-center justify-between gap-4">
              <h2 class="font-semibold">Task checklist</h2>
              <span class="text-sm text-slate-500">{state.completedTaskCount().length} complete</span>
            </div>
            <ul class="mt-4 space-y-3">
              <For each={tasks}>
                {(task) => (
                  <li class="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p
                        class={
                          state.taskIsComplete(task.id) ? "font-medium text-slate-400 line-through" : "font-medium"
                        }
                      >
                        {task.title}
                      </p>
                      <p class="mt-1 text-sm text-slate-500">Owner: {task.owner}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      class=""
                      aria-pressed={state.taskIsComplete(task.id)}
                      onClick={() => state.taskToggle(task.id)}
                    >
                      {state.taskIsComplete(task.id) ? "Completed" : "Mark complete"}
                    </Button>
                  </li>
                )}
              </For>
            </ul>
          </div>
        </Show>
      </section>
    </DemoShell>
  )
}
