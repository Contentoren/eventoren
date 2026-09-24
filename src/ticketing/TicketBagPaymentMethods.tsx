export function TicketBagPaymentMethods(props: { title: string }) {
  return (
    <div class="flex flex-col gap-space-3 rounded-control border border-border-subtle bg-surface-muted/50 p-space-4">
      <p class="text-xs font-medium text-content">{props.title}</p>
      <ul class="grid w-full grid-cols-4 gap-space-3" aria-label="Unterstützte Zahlungsmethoden">
        <li class="min-w-0">
          <img src="/images/payment-methods/paypal-old.png" alt="PayPal" class="h-10 w-full object-contain" />
        </li>
        <li class="min-w-0">
          <img src="/images/payment-methods/visa-alternate.png" alt="Visa" class="h-10 w-full object-contain" />
        </li>
        <li class="min-w-0">
          <img src="/images/payment-methods/sepa.png" alt="SEPA" class="h-10 w-full object-contain" />
        </li>
        <li class="min-w-0">
          <img src="/images/payment-methods/klarna-sofort.png" alt="Klarna Sofort" class="h-10 w-full object-contain" />
        </li>
        <li class="min-w-0">
          <img src="/images/payment-methods/mastercard.png" alt="Mastercard" class="h-10 w-full object-contain" />
        </li>
        <li class="min-w-0">
          <img src="/images/payment-methods/maestro.png" alt="Maestro" class="h-10 w-full object-contain" />
        </li>
        <li class="min-w-0">
          <img
            src="/images/payment-methods/american-express.png"
            alt="American Express"
            class="h-10 w-full object-contain"
          />
        </li>
        <li class="min-w-0">
          <img src="/images/payment-methods/discover.png" alt="Discover" class="h-10 w-full object-contain" />
        </li>
      </ul>
    </div>
  )
}
