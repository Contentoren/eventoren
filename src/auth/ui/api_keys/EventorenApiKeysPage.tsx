import { For, Show } from "solid-js"
import type { ApiKeyExpiryPreset } from "#src/auth/model/apiKeyExpiryPreset.ts"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { eventorenApiKeysPageStateCreate } from "./eventorenApiKeysPageStateCreate.ts"

const expiryPresets: readonly ApiKeyExpiryPreset[] = [
  "never",
  "1-day",
  "1-week",
  "1-month",
  "1-year",
  "2-years",
  "3-years",
]

export function EventorenApiKeysPage() {
  const state = eventorenApiKeysPageStateCreate()

  return (
    <div class="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <header>
        <h1 class="text-3xl font-bold">API-Schlüssel</h1>
        <p class="mt-2 max-w-2xl text-sm text-content-muted">
          API-Schlüssel authentifizieren CLI-, MCP- und Server-API-Aufrufe in Ihrem Namen. Ein Geheimnis wird nur
          einmal angezeigt.
        </p>
      </header>

      <section aria-label="API-Schlüssel erstellen" class="rounded-control border border-border bg-surface p-6 shadow-sm">
        <h2 class="text-xl font-semibold">API-Schlüssel erstellen</h2>
        <form onSubmit={state.createKey} class="mt-4 flex flex-col gap-4">
          <label class="flex max-w-xs flex-col gap-1 text-sm font-medium">
            Name
            <input
              value={state.name.get()}
              onInput={(event) => state.name.set(event.target.value)}
              placeholder="Meine Integration"
              maxlength={80}
              class="rounded-control border border-border bg-background px-3 py-2 text-sm font-normal"
            />
          </label>
          <label class="flex max-w-xs flex-col gap-1 text-sm font-medium">
            Gültigkeit
            <select
              value={state.expiryPreset.get()}
              onChange={(event) => state.expiryPreset.set(event.target.value as ApiKeyExpiryPreset)}
              class="rounded-control border border-border bg-background px-3 py-2 text-sm font-normal"
            >
              <For each={expiryPresets}>{(preset) => <option value={preset}>{preset}</option>}</For>
            </select>
          </label>
          <Show when={state.error.get()}>
            <p class="text-sm text-red-600 dark:text-red-400">{state.error.get()}</p>
          </Show>
          <div>
            <Button type="submit" variant={buttonVariant.contrast} disabled={state.busy.get()}>
              Schlüssel erstellen
            </Button>
          </div>
        </form>
        <Show when={state.credential.get()}>
          <div class="mt-4 rounded-control border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/40">
            <p class="mb-2 font-semibold">Dieses Geheimnis jetzt kopieren. Es wird nur einmal angezeigt.</p>
            <code class="block break-all rounded bg-black/5 p-2 dark:bg-white/10">{state.credential.get()}</code>
            <div class="mt-3">
              <Button variant={buttonVariant.ghost} onClick={state.dismissCredential}>
                Fertig
              </Button>
            </div>
          </div>
        </Show>
      </section>

      <section aria-label="Ihre API-Schlüssel" class="rounded-control border border-border bg-surface p-6 shadow-sm">
        <h2 class="text-xl font-semibold">Ihre API-Schlüssel</h2>
        <Show when={state.loading()}>
          <p class="mt-4 text-sm text-content-muted">Wird geladen…</p>
        </Show>
        <Show when={state.listError()}>
          <p class="mt-4 text-sm text-red-600 dark:text-red-400">{state.listError()}</p>
        </Show>
        <Show when={!state.loading() && !state.listError() && state.items().length === 0}>
          <p class="mt-4 text-sm text-content-muted">Noch keine API-Schlüssel.</p>
        </Show>
        <ul class="mt-4 flex flex-col gap-3">
          <For each={state.items()}>
            {(key) => (
              <li class="rounded-control border border-border p-4">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold">{key.name}</p>
                    <p class="truncate font-mono text-xs text-content-muted">{key.maskedCredential}</p>
                    <p class="text-xs text-content-muted">
                      {key.status}
                      <Show when={key.expiresAt}> · läuft ab {key.expiresAt}</Show>
                    </p>
                  </div>
                  <div class="flex gap-2">
                    <Show
                      when={state.editingId.get() === key.id}
                      fallback={
                        <>
                          <Button
                            variant={buttonVariant.ghost}
                            disabled={state.busy.get() || key.status !== "active"}
                            onClick={() => state.edit(key)}
                          >
                            Umbenennen
                          </Button>
                          <Button
                            variant={buttonVariant.ghost}
                            disabled={state.busy.get() || key.status !== "active"}
                            onClick={() => state.rotate(key.id)}
                          >
                            Rotieren
                          </Button>
                          <Button
                            variant={buttonVariant.ghost}
                            disabled={state.busy.get() || key.status === "revoked"}
                            onClick={() => state.revoke(key.id)}
                          >
                            Widerrufen
                          </Button>
                        </>
                      }
                    >
                      <form onSubmit={state.saveEdit} class="flex items-center gap-2">
                        <input
                          value={state.editName.get()}
                          onInput={(event) => state.editName.set(event.target.value)}
                          maxlength={80}
                          aria-label="Name"
                          class="rounded-control border border-border bg-background px-2 py-1 text-sm"
                        />
                        <Button type="submit" variant={buttonVariant.contrast} disabled={state.busy.get()}>
                          Speichern
                        </Button>
                        <Button variant={buttonVariant.ghost} onClick={state.cancelEdit}>
                          Abbrechen
                        </Button>
                      </form>
                    </Show>
                  </div>
                </div>
                <Show when={state.editingId.get() === key.id && state.editError.get()}>
                  <p class="mt-2 text-sm text-red-600 dark:text-red-400">{state.editError.get()}</p>
                </Show>
              </li>
            )}
          </For>
        </ul>
        <div class="mt-4 flex items-center gap-3 text-sm">
          <span class="text-content-muted">
            Seite {state.pageNumber()}
          </span>
          <Button variant={buttonVariant.ghost} disabled={!state.hasNext()} onClick={state.next}>
            Weitere laden
          </Button>
        </div>
      </section>
    </div>
  )
}
