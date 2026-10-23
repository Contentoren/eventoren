import { Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { SiteFrame } from "#src/components/SiteFrame.tsx"
import { UiContainer } from "#src/ui/UiContainer.tsx"
import { UiCard } from "#src/ui/UiCard.tsx"
import { organizerTerminationPageStateCreate } from "./organizerTerminationPageStateCreate.ts"

export function OrganizerTerminationPage() {
  const state = organizerTerminationPageStateCreate()
  return (
    <SiteFrame>
      <main id="content" tabindex="-1">
        <UiContainer width="narrow" class="py-space-7">
          <UiCard>
            <h1 class="text-2xl font-bold">Veranstaltervertrag widerrufen oder kündigen</h1>
            <p>
              Ohne Anmeldung. Diese Erklärung betrifft den Veranstaltervertrag, nicht gekaufte Veranstaltungstickets.
              Die rechtliche Wirksamkeit wird gesondert geprüft. Es erfolgt keine automatische Deaktivierung Ihrer
              Organisation.
            </p>
            <Show when={state.error()}>
              <p role="alert">{state.error()}</p>
            </Show>
            <Show
              when={!state.submitted()}
              fallback={
                <section aria-live="polite">
                  <h2>Ihre Erklärung ist eingegangen</h2>
                  <p>Ein Versandfehler bei der E-Mail ändert nichts am Eingang Ihrer Erklärung.</p>
                  <Show when={state.receipt()}>
                    {(receipt) => (
                      <>
                        <p>Beleg-ID: {receipt().id}</p>
                        <p>Eingang (Europe/Berlin): {state.receivedAt()}</p>
                        <pre class="whitespace-pre-wrap">{receipt().declaration}</pre>
                        <p>
                          E-Mail:{" "}
                          {receipt().delivery?.status === "sent"
                            ? "An Sie und den Betreiber versandt"
                            : receipt().delivery?.status === "failed"
                              ? "Versand fehlgeschlagen; automatische Wiederholung vorgesehen"
                              : "Versand ausstehend"}{" "}
                          (Versuche: {receipt().delivery?.attempts ?? 0})
                        </p>
                        <Show when={receipt().delivery?.status === "failed"}>
                          <Button disabled={state.busy()} onClick={state.retry}>
                            E-Mail erneut versuchen (nach 5 Minuten)
                          </Button>
                        </Show>
                        <p>Bitte diesen Beleg über die Druckfunktion Ihres Browsers speichern.</p>
                      </>
                    )}
                  </Show>
                </section>
              }
            >
              <Show
                when={!state.review()}
                fallback={
                  <section>
                    <h2>Erklärung prüfen</h2>
                    <pre class="whitespace-pre-wrap">{state.declaration()}</pre>
                    <p>
                      Mit der Bestätigung übermitteln Sie diese Erklärung verbindlich. Sie erhalten eine
                      Empfangsbestätigung per E-Mail.
                    </p>
                    <Button disabled={state.busy()} onClick={state.edit}>
                      Angaben ändern
                    </Button>
                    <Button disabled={state.busy()} onClick={state.submit}>
                      {state.draft().kind === "widerruf" ? "Widerruf bestätigen" : "Jetzt kündigen"}
                    </Button>
                  </section>
                }
              >
                <form class="flex flex-col gap-space-4" onSubmit={state.preview}>
                  <label>
                    Art der Erklärung
                    <select value={state.draft().kind} onChange={(e) => state.update("kind", e.currentTarget.value)}>
                      <option value="widerruf">Widerruf</option>
                      <option value="kuendigung">Kündigung</option>
                    </select>
                  </label>
                  <label>
                    Vollständiger Name / rechtlicher Firmenname *
                    <input
                      required
                      maxlength="200"
                      value={state.draft().legalName}
                      onInput={(e) => state.update("legalName", e.currentTarget.value)}
                    />
                  </label>
                  <label>
                    E-Mail für die Bestätigung *
                    <input
                      required
                      type="email"
                      maxlength="254"
                      value={state.draft().email}
                      onInput={(e) => state.update("email", e.currentTarget.value)}
                    />
                  </label>
                  <label>
                    Vertrag / Organisationsname oder ID *
                    <input
                      required
                      maxlength="500"
                      value={state.draft().contractReference}
                      onInput={(e) => state.update("contractReference", e.currentTarget.value)}
                    />
                  </label>
                  <Show when={state.draft().kind === "kuendigung"}>
                    <label>
                      Gewünschtes Vertragsende (optional, Kalenderdatum in Europe/Berlin)
                      <input
                        type="date"
                        value={state.draft().requestedDate ?? ""}
                        onInput={(e) => state.update("requestedDate", e.currentTarget.value)}
                      />
                    </label>
                    <p>Ohne Datum kündigen Sie zum nächstmöglichen Zeitpunkt.</p>
                    <label>
                      Grund für eine außerordentliche Kündigung (optional)
                      <textarea
                        maxlength="4000"
                        value={state.draft().extraordinaryReason ?? ""}
                        onInput={(e) => state.update("extraordinaryReason", e.currentTarget.value)}
                      />
                    </label>
                  </Show>
                  <p>
                    Ihre Angaben werden zur Bearbeitung der Erklärung gespeichert und an kontakt@semesterkur.de
                    übermittelt. <a href="/datenschutz">Datenschutz</a>
                  </p>
                  <Button type="submit">Erklärung überprüfen</Button>
                </form>
              </Show>
            </Show>
          </UiCard>
        </UiContainer>
      </main>
    </SiteFrame>
  )
}
