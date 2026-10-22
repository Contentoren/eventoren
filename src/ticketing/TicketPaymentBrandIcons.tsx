import { For, Show } from "solid-js"
import { urlImage } from "../app/assets/urlImage.ts"
import type { TicketPaymentMethodBrand } from "./ticketPaymentMethodsGet.ts"

export function TicketPaymentBrandIcons(props: { brands: readonly TicketPaymentMethodBrand[]; label: string }) {
  return (
    <Show when={props.brands.length > 0}>
      <ul class="grid w-full grid-cols-4 gap-space-3" aria-label={props.label}>
        <For each={props.brands}>
          {(brand) => (
            <>
              <For each={brand.icons}>
                {(icon) => (
                  <li class="min-w-0">
                    <img
                      src={urlImage(icon.image)}
                      alt={icon.alt}
                      title={brand.label}
                      loading="lazy"
                      class="h-10 w-full object-contain"
                    />
                  </li>
                )}
              </For>
              <Show when={brand.icons.length === 0}>
                <li class="flex min-h-10 min-w-0 items-center justify-center rounded-control border border-border-subtle px-space-2 text-center text-xs font-medium text-content">
                  {brand.label}
                </li>
              </Show>
            </>
          )}
        </For>
      </ul>
    </Show>
  )
}
