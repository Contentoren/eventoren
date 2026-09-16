import type { JSX } from "solid-js"
import { For } from "solid-js"
import { Link } from "@tanstack/solid-router"
import { LanguageSelector } from "../../app/i18n/LanguageSelector.tsx"
import { demoScenarioText } from "../model/demoScenarioText.ts"
import { demoText } from "../model/demoText.ts"
import { demoScenarios } from "../model/demoScenarios.js"

export function DemoShell(props: { readonly currentId: string; readonly children: JSX.Element }) {
  return (
    <div class="min-h-dvh bg-slate-50 text-slate-950">
      <header class="border-b border-slate-200 bg-white px-6 py-4">
        <div class="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link class="font-semibold" to="/demo">
            {demoText("shellTitle")}
          </Link>
          <div class="flex items-center gap-3">
            <span class="text-sm text-slate-500">{demoText("shellDetail")}</span>
            <LanguageSelector />
          </div>
        </div>
      </header>
      <div class="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside class="rounded-xl border border-slate-200 bg-white p-4" aria-label={demoText("shellDirectory")}>
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{demoText("shellDirectory")}</p>
          <nav class="mt-3 flex flex-col gap-2">
            <For each={demoScenarios.filter((scenario) => scenario.id !== "directory")}>
              {(scenario) => (
                <Link
                  to={scenario.path}
                  class="rounded-md px-3 py-2 text-sm hover:bg-slate-100"
                  aria-current={scenario.id === props.currentId ? "page" : undefined}
                >
                  {demoScenarioText(scenario).title}
                </Link>
              )}
            </For>
          </nav>
        </aside>
        <div>{props.children}</div>
      </div>
    </div>
  )
}
