import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"

export function TicketCheckoutEmptyState(props: {
  title: string
  message: string
  fallbackPath: "/" | "/warenkorb"
  returnLabel: string
}) {
  return (
    <CardWrapper
      role="alert"
      aria-labelledby="checkout-empty-title"
      class="flex flex-col items-start gap-space-4 border-danger/50 bg-danger-soft"
    >
      <h2 id="checkout-empty-title" class="text-lg font-semibold text-danger">
        {props.title}
      </h2>
      <p class="text-sm text-danger">{props.message}</p>
      <LinkButtonInternal to={props.fallbackPath} variant="outline" size="sm">
        {props.returnLabel}
      </LinkButtonInternal>
    </CardWrapper>
  )
}
