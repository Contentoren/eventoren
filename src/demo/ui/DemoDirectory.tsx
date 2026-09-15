import { For } from "solid-js"
import { demoScenarioText } from "../model/demoScenarioText.ts"
import { demoText } from "../model/demoText.ts"
import { demoScenarios } from "../model/demoScenarios.js"
import { DemoShell } from "./DemoShell.js"

export function DemoDirectory() {
  return (
    <DemoShell currentId="directory">
      <section aria-labelledby="demo-title" class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p class="text-sm font-semibold uppercase tracking-wide text-indigo-600">{demoText("directoryEyebrow")}</p>
        <h1 id="demo-title" class="mt-2 text-3xl font-bold tracking-tight">
          {demoText("directoryTitle")}
        </h1>
        <p class="mt-4 max-w-2xl text-slate-600">{demoText("directoryDescription")}</p>
        <div class="mt-8 grid gap-4 sm:grid-cols-2">
          <For each={demoScenarios.filter((scenario) => scenario.id !== "directory")}>
            {(scenario) => (
              <a
                class="rounded-lg border border-slate-200 p-4 transition hover:border-indigo-400 hover:bg-indigo-50"
                href={scenario.path}
              >
                <h2 class="font-semibold">{demoScenarioText(scenario).title}</h2>
                <p class="mt-2 text-sm text-slate-600">{demoScenarioText(scenario).detail}</p>
                <span class="mt-4 inline-block text-sm font-medium text-indigo-700">{demoText("open")}</span>
              </a>
            )}
          </For>
        </div>
      </section>
    </DemoShell>
  )
}
