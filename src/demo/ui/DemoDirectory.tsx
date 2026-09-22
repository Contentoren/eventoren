import { Link } from "@tanstack/solid-router"
import { For } from "solid-js"
import { demoScenarioText } from "../model/demoScenarioText.ts"
import { demoDirectoryStateCreate } from "../state/demoDirectoryStateCreate.ts"

export function DemoDirectory() {
  const state = demoDirectoryStateCreate()

  return (
    <div class="space-y-8">
      <section aria-labelledby="demo-title" class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p class="text-sm font-semibold uppercase tracking-wide text-indigo-600">{state.eyebrow()}</p>
        <h1 id="demo-title" class="mt-2 text-3xl font-bold tracking-tight">
          {state.title()}
        </h1>
        <p class="mt-4 max-w-2xl text-slate-600">{state.description()}</p>

        <div class="mt-6 border-t border-slate-100 pt-5">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-500">{state.quickEntriesTitle()}</h2>
          <div class="mt-3 flex flex-wrap gap-2.5">
            <For each={state.quickEntries()}>
              {(entry) => (
                <Link
                  to={entry.path}
                  class="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50/60 px-3.5 py-2 text-sm font-medium text-indigo-900 transition hover:border-indigo-400 hover:bg-indigo-100"
                >
                  <span class="rounded bg-indigo-600 px-1.5 py-0.5 text-[11px] font-semibold uppercase text-white">
                    {entry.badge}
                  </span>
                  <span>{entry.title}</span>
                  <span class="text-indigo-500">→</span>
                </Link>
              )}
            </For>
          </div>
        </div>
      </section>

      <For each={state.groups()}>
        {(group) => (
          <section
            id={group.id}
            aria-labelledby={`heading-${group.id}`}
            class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
          >
            <div class="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                <h2 id={`heading-${group.id}`} class="text-xl font-bold tracking-tight text-slate-900">
                  {group.title}
                </h2>
                <p class="mt-1 text-sm text-slate-600">{group.description}</p>
              </div>
              <Link
                to={group.entryPath}
                class="inline-flex shrink-0 items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800"
              >
                {group.entryLabel} →
              </Link>
            </div>

            <div class="mt-6 grid gap-4 sm:grid-cols-2">
              <For each={group.scenarios}>
                {(scenario) => (
                  <Link
                    to={scenario.path}
                    class="flex flex-col justify-between rounded-lg border border-slate-200 p-4 transition hover:border-indigo-400 hover:bg-indigo-50"
                  >
                    <div>
                      <h3 class="font-semibold text-slate-900">{demoScenarioText(scenario).title}</h3>
                      <p class="mt-2 text-sm text-slate-600">{demoScenarioText(scenario).detail}</p>
                    </div>
                    <div class="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
                      <span class="truncate font-mono text-[11px] text-slate-400">{scenario.path}</span>
                      <span class="ml-2 shrink-0 font-medium text-indigo-700">{state.openText()}</span>
                    </div>
                  </Link>
                )}
              </For>
            </div>
          </section>
        )}
      </For>
    </div>
  )
}
