import { Link } from "@tanstack/solid-router"
import type { JSX, ParentComponent } from "solid-js"
import { For, Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import { Input } from "#ui/input/input/Input.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { SiteFrame } from "../components/SiteFrame.tsx"
import { UiContainer } from "../ui/UiContainer.tsx"
import type { OrganizerEventDetailPageState } from "./OrganizerEventDetailPageState.ts"

export function OrganizerEventDetailPage(props: {
  readonly state: OrganizerEventDetailPageState
  readonly frame?: ParentComponent
  readonly backHref?: string
  readonly scannerSimulation?: JSX.Element
}) {
  const state = props.state

  return (
    <Dynamic component={props.frame ?? SiteFrame}>
      <main id="content" tabindex="-1" class="flex-1">
        <UiContainer width="wide" class="flex flex-col gap-space-6 py-space-8 sm:py-space-10">
          <header class="flex flex-col gap-space-3">
            <div class="flex flex-wrap items-center gap-space-3">
              <Show
                when={props.backHref}
                fallback={
                  <Link to="/organizer" class="focus-ring text-sm font-semibold text-brand-accent hover:underline">
                    ← {state.text().back}
                  </Link>
                }
              >
                {(backHref) => (
                  <a href={backHref()} class="focus-ring text-sm font-semibold text-brand-accent hover:underline">
                    ← {state.text().back}
                  </a>
                )}
              </Show>
            </div>
            <p class="text-sm font-semibold uppercase tracking-widest text-brand-accent">{state.text().area}</p>
            <h1 class="text-3xl font-semibold tracking-tight text-content sm:text-4xl">
              {state.event()?.title ?? state.text().tickets}
            </h1>
            <p class="max-w-2xl text-content-muted">{state.text().ticketsDescription}</p>
          </header>

          <Show when={state.errorMessage()}>
            <p
              role="alert"
              class="rounded-control border border-danger/50 bg-danger-soft p-space-4 text-sm text-danger"
            >
              {state.errorMessage()}
            </p>
          </Show>
          <Show when={state.successMessage()}>
            <p
              role="status"
              class="rounded-control border border-success/50 bg-success-soft p-space-4 text-sm text-success"
            >
              {state.successMessage()}
            </p>
          </Show>

          <CardWrapper class="flex flex-col gap-space-4">
            <div>
              <h2 class="text-xl font-semibold text-content">{state.text().scannerTitle}</h2>
              <p class="mt-space-1 max-w-3xl text-sm text-content-muted">{state.text().scannerDescription}</p>
            </div>
            {props.scannerSimulation}
            <video
              ref={state.scannerVideoSet}
              autoplay
              muted
              playsinline
              class="aspect-video w-full rounded-control bg-surface-muted object-cover"
              aria-label={state.text().scannerTitle}
            />
            <Show when={state.scannerErrorMessage()}>
              <p
                role="alert"
                class="rounded-control border border-danger/50 bg-danger-soft p-space-3 text-sm text-danger"
              >
                {state.scannerErrorMessage()}
              </p>
            </Show>
            <Show when={state.scannerOutcome()}>
              {(outcome) => (
                <div
                  role={outcome().kind === "success" ? "status" : "alert"}
                  class={
                    outcome().kind === "success"
                      ? "rounded-control border border-success/50 bg-success-soft p-space-3 text-sm text-success"
                      : "rounded-control border border-danger/50 bg-danger-soft p-space-3 text-sm text-danger"
                  }
                >
                  <p class="font-semibold">{outcome().message}</p>
                  <p class="mt-1 break-all font-mono text-xs">{outcome().code}</p>
                </div>
              )}
            </Show>
            <Show when={state.scannerOutcome()?.kind === "denied"}>
              <Show when={state.duplicateInfo()}>
                {(duplicate) => (
                  <div class="rounded-control border border-warning/50 bg-warning-soft p-space-3 text-sm text-content">
                    <p class="font-semibold text-warning">{state.text().duplicateTitle}</p>
                    <p class="mt-1">
                      {state.text().checkedInAt}: {state.dateTime(duplicate().previousCheckedInAt)} ·{" "}
                      {state.text().elapsed}: {state.elapsed(duplicate().elapsedMilliseconds)}
                    </p>
                    <p class="mt-1">
                      {state.text().ticketNumber}: {duplicate().ticketNumber} · {state.text().operator}:{" "}
                      {duplicate().previousOperator}
                    </p>
                  </div>
                )}
              </Show>
            </Show>
            <div class="flex flex-wrap items-center gap-space-3">
              <Button
                variant={state.scannerActive() ? "outline" : undefined}
                disabled={state.scannerStarting()}
                onClick={() => (state.scannerActive() ? state.scannerStop() : void state.scannerStart())}
              >
                {state.scannerStarting()
                  ? state.text().scannerStarting
                  : state.scannerActive()
                    ? state.text().scannerStop
                    : state.text().scannerStart}
              </Button>
              <Show when={state.scannerActive()}>
                <p role="status" class="text-sm text-content-muted">
                  {state.scannerCheckingIn() ? state.text().scannerCheckingIn : state.text().scannerActive}
                </p>
              </Show>
            </div>
          </CardWrapper>

          <div class="grid min-h-[32rem] gap-space-6 lg:grid-cols-[minmax(18rem,0.85fr)_minmax(22rem,1.15fr)]">
            <CardWrapper class="flex min-h-0 flex-col gap-space-4">
              <div>
                <label for="organizer-ticket-search" class="text-sm font-semibold text-content">
                  {state.text().searchLabel}
                </label>
                <Input
                  id="organizer-ticket-search"
                  type="search"
                  value={state.search()}
                  placeholder={state.text().searchPlaceholder}
                  onInput={(event) => state.searchChange(event.currentTarget.value)}
                  class="mt-space-2 w-full"
                />
              </div>
              <Show
                when={state.tickets().length > 0 || !state.loading()}
                fallback={
                  <p role="status" class="text-sm text-content-muted">
                    {state.text().loading}
                  </p>
                }
              >
                <Show
                  when={state.tickets().length > 0}
                  fallback={
                    <Show when={state.isDone()}>
                      <p class="text-sm text-content-muted">{state.text().noTickets}</p>
                    </Show>
                  }
                >
                  <ul class="flex max-h-[36rem] flex-col gap-space-2 overflow-y-auto pr-space-1">
                    <For each={state.tickets()}>
                      {(ticket) => (
                        <li>
                          <Button
                            variant="outline"
                            class="h-auto min-h-14 w-full justify-between gap-space-3 px-space-3 py-space-3 text-left"
                            classList={{ "border-brand-accent bg-brand-soft": state.selectedTicketId() === ticket.id }}
                            aria-pressed={state.selectedTicketId() === ticket.id}
                            onClick={() => state.ticketSelect(ticket)}
                          >
                            <span class="min-w-0">
                              <span class="block truncate font-semibold text-content">{ticket.participantName}</span>
                              <span class="block truncate text-xs text-content-muted">
                                {ticket.buyerName} · {ticket.ticketNumber}
                              </span>
                            </span>
                            <Badge variant={ticket.checkedIn ? "filledGreen" : "outline"}>
                              {ticket.checkedIn ? state.text().checkedIn : state.text().notCheckedIn}
                            </Badge>
                          </Button>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
                <Show when={!state.isDone()}>
                  <div class="flex justify-center">
                    <Button variant="outline" disabled={state.loading()} onClick={state.loadMore}>
                      {state.loading() ? state.text().loading : state.text().loadMore}
                    </Button>
                  </div>
                </Show>
              </Show>
            </CardWrapper>

            <CardWrapper class="min-h-[20rem]">
              <Show
                when={state.selectedTicket()}
                fallback={<p class="text-content-muted">{state.text().selectTicket}</p>}
              >
                {(ticket) => (
                  <div class="flex h-full flex-col gap-space-6">
                    <div class="flex flex-wrap items-start justify-between gap-space-3">
                      <div>
                        <p class="text-sm text-content-muted">{state.text().ticketNumber}</p>
                        <h2 class="break-all text-2xl font-semibold text-content">{ticket().ticketNumber}</h2>
                      </div>
                      <Badge variant={ticket().checkedIn ? "filledGreen" : "outline"} class="text-base">
                        {ticket().checkedIn ? state.text().checkedIn : state.text().notCheckedIn}
                      </Badge>
                    </div>

                    <dl class="grid gap-space-4 sm:grid-cols-2">
                      <div>
                        <dt class="text-xs font-semibold uppercase tracking-wide text-content-muted">
                          {state.text().participant}
                        </dt>
                        <dd class="mt-1 font-semibold text-content">{ticket().participantName}</dd>
                        <Show when={ticket().participantNameSource === "buyer"}>
                          <p class="mt-1 text-xs text-warning">{state.text().participantFallback}</p>
                        </Show>
                      </div>
                      <div>
                        <dt class="text-xs font-semibold uppercase tracking-wide text-content-muted">
                          {state.text().buyer}
                        </dt>
                        <dd class="mt-1 text-content">{ticket().buyerName}</dd>
                      </div>
                      <div>
                        <dt class="text-xs font-semibold uppercase tracking-wide text-content-muted">
                          {state.text().buyerEmail}
                        </dt>
                        <dd class="mt-1 break-all text-content">{ticket().buyerEmail}</dd>
                      </div>
                      <div>
                        <dt class="text-xs font-semibold uppercase tracking-wide text-content-muted">
                          {state.text().price}
                        </dt>
                        <dd class="mt-1 text-content">{state.currency(ticket().priceCents)}</dd>
                      </div>
                    </dl>

                    <div class="flex flex-wrap gap-space-2">
                      <Badge
                        variant={
                          ticket().paymentStatus === "paid" && ticket().orderStatus === "paid"
                            ? "filledGreen"
                            : "filledYellow"
                        }
                      >
                        {ticket().paymentStatus === "paid" && ticket().orderStatus === "paid"
                          ? state.text().paid
                          : state.text().unpaid}
                      </Badge>
                      <Badge variant={ticket().cancelled ? "filledRed" : "outline"}>
                        {ticket().cancelled ? state.text().cancelled : state.text().valid}
                      </Badge>
                    </div>

                    <Show when={ticket().checkedIn}>
                      <div class="rounded-control border border-success/40 bg-success-soft p-space-4">
                        <p class="font-semibold text-success">{state.text().checkedIn}</p>
                        <p class="mt-space-2 text-sm text-content">
                          {state.text().checkedInAt}: {state.dateTime(ticket().checkedInAt)}
                        </p>
                        <p class="mt-space-1 text-sm text-content">
                          {state.text().operator}: {ticket().checkedInByName ?? state.text().unknown}
                        </p>
                      </div>
                    </Show>

                    <Show when={state.duplicateInfo()}>
                      {(duplicate) => (
                        <div class="rounded-control border border-warning/50 bg-warning-soft p-space-4 text-sm text-content">
                          <p class="font-semibold text-warning">{state.text().duplicateTitle}</p>
                          <dl class="mt-space-3 grid gap-space-2 sm:grid-cols-2">
                            <div>
                              <dt class="text-content-muted">{state.text().checkedInAt}</dt>
                              <dd>{state.dateTime(duplicate().previousCheckedInAt)}</dd>
                            </div>
                            <div>
                              <dt class="text-content-muted">{state.text().elapsed}</dt>
                              <dd>{state.elapsed(duplicate().elapsedMilliseconds)}</dd>
                            </div>
                            <div>
                              <dt class="text-content-muted">{state.text().operator}</dt>
                              <dd>{duplicate().previousOperator}</dd>
                            </div>
                            <div>
                              <dt class="text-content-muted">{state.text().ticketNumber}</dt>
                              <dd class="break-all">{duplicate().ticketNumber}</dd>
                            </div>
                            <div>
                              <dt class="text-content-muted">{state.text().participant}</dt>
                              <dd>{duplicate().participantName}</dd>
                            </div>
                            <div>
                              <dt class="text-content-muted">{state.text().buyer}</dt>
                              <dd>
                                {duplicate().buyerName} · {duplicate().buyerEmail}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      )}
                    </Show>

                    <div class="mt-auto">
                      <Show
                        when={ticket().checkedIn}
                        fallback={
                          <Button
                            size="lg"
                            class="w-full"
                            disabled={
                              state.actionPending() ||
                              ticket().cancelled ||
                              ticket().paymentStatus !== "paid" ||
                              ticket().orderStatus !== "paid"
                            }
                            onClick={() => void state.ticketCheckIn()}
                          >
                            {state.actionPending() ? state.text().working : state.text().checkIn}
                          </Button>
                        }
                      >
                        <Button
                          variant="outline"
                          size="lg"
                          class="w-full"
                          disabled={state.actionPending()}
                          onClick={() => void state.ticketReset()}
                        >
                          {state.actionPending() ? state.text().working : state.text().reset}
                        </Button>
                      </Show>
                    </div>
                  </div>
                )}
              </Show>
            </CardWrapper>
          </div>
        </UiContainer>
      </main>
    </Dynamic>
  )
}
