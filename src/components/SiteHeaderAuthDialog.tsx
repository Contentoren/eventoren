import { For, Show } from "solid-js"
import { UiButton } from "../ui/UiButton.tsx"
import { UiDialog } from "../ui/UiDialog.tsx"
import { SiteHeaderAuthProviderIcon } from "./SiteHeaderAuthProviderIcon.tsx"
import { siteHeaderAuthDialogStateCreate } from "./siteHeaderAuthDialogStateCreate.ts"
import { siteHeaderAuthProviders } from "./siteHeaderAuthProviders.ts"

export function SiteHeaderAuthDialog(props: { open: boolean; onClose: () => void }) {
  const state = siteHeaderAuthDialogStateCreate()

  return (
    <UiDialog
      open={props.open}
      onClose={() => props.onClose()}
      title={state.title()}
      description={state.description()}
      width="sm"
    >
      <div class="flex flex-col gap-space-3">
        <For each={siteHeaderAuthProviders}>
          {(provider) => (
            <button
              type="button"
              class="focus-ring flex h-11 w-full items-center justify-center gap-space-3 rounded-control bg-surface-muted px-space-5 text-sm font-semibold text-content ring-1 ring-inset ring-border-strong transition-colors hover:ring-brand-accent"
            >
              <SiteHeaderAuthProviderIcon id={provider.id} />
              {provider.label}
            </button>
          )}
        </For>
      </div>

      <div class="flex items-center gap-space-4" aria-hidden="true">
        <span class="h-px flex-1 bg-border-subtle" />
        <span class="text-xs font-medium uppercase tracking-widest text-content-muted">oder</span>
        <span class="h-px flex-1 bg-border-subtle" />
      </div>

      <form
        class="flex flex-col gap-space-4"
        onSubmit={(event) => {
          event.preventDefault()
          state.submitEmail()
        }}
      >
        <div>
          <label for="site-header-auth-email" class="mb-space-2 block text-sm font-medium text-content">
            E-Mail-Adresse
          </label>
          <input
            id="site-header-auth-email"
            type="email"
            autocomplete="email"
            required
            value={state.email()}
            placeholder="du@beispiel.de"
            onInput={(event) => state.changeEmail(event.currentTarget.value)}
            class="focus-ring h-11 w-full rounded-control border border-border-strong bg-surface-muted px-space-4 text-sm text-content placeholder:text-content-muted"
          />
        </div>

        <UiButton type="submit" size="md" block disabled={!state.emailIsValid()}>
          {state.submitLabel()}
        </UiButton>
      </form>

      <p aria-live="polite" class="min-h-5 text-sm text-success">
        <Show when={state.statusMessage()}>{state.statusMessage()}</Show>
      </p>

      <button
        type="button"
        onClick={() => state.switchMode()}
        class="focus-ring rounded-control text-sm font-semibold text-brand-accent underline-offset-4 hover:underline"
      >
        {state.switchLabel()}
      </button>
    </UiDialog>
  )
}
