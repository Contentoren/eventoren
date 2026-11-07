import { mdiTicketConfirmationOutline } from "@adaptive-ds/mdi/mdiTicketConfirmationOutline.js"
import { Show } from "solid-js"
import { LinkTextInternal } from "#ui/interactive/link/LinkText.tsx"
import { Icon } from "#ui/static/icon/Icon.tsx"
import { Img } from "#ui/static/img/Img.tsx"
import { DotPill } from "#ui/static/pill/DotPill.tsx"
import type { ContentCard } from "./ContentCard.ts"

/** Article card: image (or placeholder), category, title link (whole card clickable), description, reading time and date. */
export function ContentCardView(props: { readonly card: ContentCard; readonly headingLevel?: 2 | 3 }) {
  return (
    <article class="group relative flex flex-col overflow-hidden rounded-card border border-border-subtle bg-surface shadow-sm transition-shadow hover:shadow-md">
      {/* Without a catalog image the card keeps its 16:9 rhythm via a decorative placeholder, never a broken <img>. */}
      <Show
        when={props.card.image}
        fallback={
          <div
            aria-hidden="true"
            class="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-surface-muted to-surface"
          >
            <Icon path={mdiTicketConfirmationOutline} class="size-12 text-content-muted/40" />
          </div>
        }
      >
        {(image) => (
          <Img
            src={image().src}
            alt={image().alt}
            width={image().width}
            height={image().height}
            class="aspect-video w-full object-cover"
          />
        )}
      </Show>
      <div class="flex flex-1 flex-col gap-3 p-5">
        <DotPill tone="brand" size="sm" dot={false} class="self-start">
          {props.card.categoryLabel}
        </DotPill>
        <h3 class="text-lg font-semibold leading-snug text-content text-balance">
          <LinkTextInternal
            to={props.card.href as never}
            class="break-normal text-content after:absolute after:inset-0 hover:text-brand-strong"
          >
            {props.card.title}
          </LinkTextInternal>
        </h3>
        <p class="line-clamp-3 text-sm leading-relaxed text-content-muted">{props.card.description}</p>
        <p class="mt-auto flex flex-wrap items-center gap-x-2 text-xs text-content-muted">
          <span>{props.card.readingTime}</span>
          <span aria-hidden="true">·</span>
          <time datetime={props.card.dateIso}>{props.card.date}</time>
        </p>
      </div>
    </article>
  )
}
