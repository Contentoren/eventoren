import { Link } from "@tanstack/solid-router"
import { classMerge } from "../ui/classMerge.ts"
import { EventorenLogo } from "./EventorenLogo.tsx"

export function SiteHeaderLogo(props: { class?: string; href?: string } = {}) {
  const content = () => <EventorenLogo iconClass="h-7 w-auto shrink-0 max-md:h-5 sm:h-8" />
  const className = classMerge(
    "focus-ring flex shrink-0 items-center rounded-control transition-opacity hover:opacity-90",
    props.class,
  )

  return props.href ? (
    <Link to={props.href} class={className} aria-label="Eventoren – zur Startseite">
      {content()}
    </Link>
  ) : (
    <Link to="/" class={className} aria-label="Eventoren – zur Startseite">
      {content()}
    </Link>
  )
}
