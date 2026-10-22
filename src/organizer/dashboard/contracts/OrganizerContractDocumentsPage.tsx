import { For } from "solid-js"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { organizerContractDocuments } from "./organizerContractDocuments.ts"

/** Static HTML: readable without authentication, client state, or browser globals. */
export function OrganizerContractDocumentsPage() {
  return (
    <main class="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <h1 class="text-2xl font-semibold">Veranstalter-Vertragsmuster</h1>
      <p role="note">
        MUSTER — keine Rechtsberatung. Nicht anwaltlich geprüft. Vor produktivem Einsatz ersetzen und prüfen lassen.
        Keine Käuferbedingungen.
      </p>
      <For each={[organizerContractDocuments.terms, organizerContractDocuments.dpa]}>
        {(document) => (
          <CardWrapper class="rounded-card border-border-subtle shadow-none">
            <article id={document.documentId} class="flex flex-col gap-4 p-6">
              <h2 class="text-xl font-semibold">{document.title}</h2>
              <p>
                Dokument: {document.documentId}
                <br />
                Revision: {document.revision}
              </p>
              <For each={document.sections}>
                {(section) => (
                  <section>
                    <h3 class="font-semibold">{section[0]}</h3>
                    <p>{section[1]}</p>
                  </section>
                )}
              </For>
            </article>
          </CardWrapper>
        )}
      </For>
    </main>
  )
}
