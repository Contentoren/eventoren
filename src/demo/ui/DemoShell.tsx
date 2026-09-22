import { Link } from "@tanstack/solid-router"
import type { JSX } from "solid-js"
import { For } from "solid-js"
import { demoScenarioText } from "../model/demoScenarioText.ts"
import { demoShellStateCreate } from "../state/demoShellStateCreate.ts"

export function DemoShell(props: { readonly currentId: string; readonly children: JSX.Element }) {
  const state = demoShellStateCreate({
    currentId: () => props.currentId,
  })

  return (
    <div class="min-h-dvh bg-slate-50 text-slate-950">
      <header class="border-b border-slate-200 bg-white px-6 py-4">
        <div class="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link class="font-semibold text-slate-900 hover:text-indigo-600" to="/demo">
            {state.title()}
          </Link>
          <div class="flex items-center gap-3">
            <span class="text-sm text-slate-500">{state.detail()}</span>
          </div>
        </div>
      </header>
      <div class="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside class="rounded-xl border border-slate-200 bg-white p-4" aria-label={state.directoryLabel()}>
          <Link
            to="/demo"
            class="block rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-indigo-600 hover:bg-indigo-50"
          >
            {state.directoryLabel()}
          </Link>
          <div class="mt-4 flex flex-col gap-5">
            <For each={state.groups()}>
              {(group) => (
                <div>
                  <p class="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{group.title}</p>
                  <nav class="mt-2 flex flex-col gap-1">
                    <For each={group.scenarios}>
                      {(scenario) => (
                        <Link
                          to={scenario.path}
                          class="rounded-md px-3 py-1.5 text-sm transition hover:bg-slate-100"
                          classList={{
                            "bg-indigo-50 font-semibold text-indigo-700": state.isCurrent(scenario.id),
                            "text-slate-700": !state.isCurrent(scenario.id),
                          }}
                          aria-current={state.isCurrent(scenario.id) ? "page" : undefined}
                        >
                          {demoScenarioText(scenario).title}
                        </Link>
                      )}
                    </For>
                  </nav>
                </div>
              )}
            </For>
          </div>
        </aside>
        <div>{props.children}</div>
      </div>
    </div>
  )
}
