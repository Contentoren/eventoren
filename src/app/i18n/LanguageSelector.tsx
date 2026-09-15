import { languageSelectorStateCreate } from "./languageSelectorStateCreate.ts"

export function LanguageSelector(props: { readonly class?: string }) {
  const state = languageSelectorStateCreate()

  return (
    <div class={props.class}>
      <label for="language-selector" class="sr-only">
        {state.text().label}
      </label>
      <select
        id="language-selector"
        aria-label={state.text().label}
        value={state.language()}
        onChange={(event) => state.languageChange(event.currentTarget.value)}
        class="h-9 rounded-control border border-border-subtle bg-surface px-2 text-xs font-semibold text-content focus:outline-none focus:ring-2 focus:ring-brand-accent"
      >
        <option value="de" selected={state.language() === "de"}>
          {state.text().de}
        </option>
        <option value="en" selected={state.language() === "en"}>
          {state.text().en}
        </option>
      </select>
    </div>
  )
}
