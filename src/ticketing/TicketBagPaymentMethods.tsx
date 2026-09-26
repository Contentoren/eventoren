import { imageList } from "../app/assets/imageList.ts"
import { urlImage } from "../app/assets/urlImage.ts"

export function TicketBagPaymentMethods(props: { title: string }) {
  return (
    <div class="flex flex-col gap-space-3 rounded-control border border-border-subtle bg-surface-muted/50 p-space-4">
      <p class="text-xs font-medium text-content">{props.title}</p>
      <ul class="grid w-full grid-cols-4 gap-space-3" aria-label="Unterstützte Zahlungsmethoden">
        <li class="min-w-0">
          <img src={urlImage(imageList.payment_methods_paypal_old)} alt="PayPal" class="h-10 w-full object-contain" />
        </li>
        <li class="min-w-0">
          <img src={urlImage(imageList.payment_methods_visa_alternate)} alt="Visa" class="h-10 w-full object-contain" />
        </li>
        <li class="min-w-0">
          <img src={urlImage(imageList.payment_methods_sepa)} alt="SEPA" class="h-10 w-full object-contain" />
        </li>
        <li class="min-w-0">
          <img
            src={urlImage(imageList.payment_methods_klarna_sofort)}
            alt="Klarna Sofort"
            class="h-10 w-full object-contain"
          />
        </li>
        <li class="min-w-0">
          <img
            src={urlImage(imageList.payment_methods_mastercard)}
            alt="Mastercard"
            class="h-10 w-full object-contain"
          />
        </li>
        <li class="min-w-0">
          <img src={urlImage(imageList.payment_methods_maestro)} alt="Maestro" class="h-10 w-full object-contain" />
        </li>
        <li class="min-w-0">
          <img
            src={urlImage(imageList.payment_methods_american_express)}
            alt="American Express"
            class="h-10 w-full object-contain"
          />
        </li>
        <li class="min-w-0">
          <img src={urlImage(imageList.payment_methods_discover)} alt="Discover" class="h-10 w-full object-contain" />
        </li>
      </ul>
    </div>
  )
}
