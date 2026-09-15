import { DemoShell } from "./DemoShell.tsx"

export function DemoRedirectHandoff() {
  return (
    <DemoShell currentId="abiball-redirect">
      <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p class="text-sm font-semibold uppercase tracking-wide text-indigo-600">Static redirect</p>
        <h1 class="mt-2 text-3xl font-bold tracking-tight">Abiball 2027</h1>
        <p class="mt-4 max-w-2xl text-slate-600">
          Die Produktionsroute antwortet mit einer Weiterleitung auf die statische Abiball-Seite. Der Ziel-Link bleibt
          hier direkt prüfbar, ohne Ticket- oder Backend-Aktion.
        </p>
        <a
          href="/abiball-2027.html"
          class="mt-6 inline-flex rounded-control bg-brand px-space-4 py-space-3 font-semibold text-brand-content"
        >
          Statische Seite öffnen →
        </a>
      </section>
    </DemoShell>
  )
}
