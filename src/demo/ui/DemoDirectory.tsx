import { For } from "solid-js"
import { DemoShell } from "./DemoShell.js"
import { demoScenarios } from "../model/demoScenarios.js"

export function DemoDirectory() {
  return (
    <DemoShell currentId="directory">
      <section aria-labelledby="demo-title" class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p class="text-sm font-semibold uppercase tracking-wide text-indigo-600">Interactive application demos</p>
        <h1 id="demo-title" class="mt-2 text-3xl font-bold tracking-tight">
          Try the application locally
        </h1>
        <p class="mt-4 max-w-2xl text-slate-600">
          These screens use fixture data and browser state only. Use the navigation to explore a realistic application
          surface without configuring a service.
        </p>
        <div class="mt-8 grid gap-4 sm:grid-cols-2">
          <For each={demoScenarios.filter((scenario) => scenario.id !== "directory")}>
            {(scenario) => (
              <a
                class="rounded-lg border border-slate-200 p-4 transition hover:border-indigo-400 hover:bg-indigo-50"
                href={scenario.path}
              >
                <h2 class="font-semibold">{scenario.title}</h2>
                <p class="mt-2 text-sm text-slate-600">{scenario.detail}</p>
                <span class="mt-4 inline-block text-sm font-medium text-indigo-700">Open demo →</span>
              </a>
            )}
          </For>
        </div>
      </section>
    </DemoShell>
  )
}
