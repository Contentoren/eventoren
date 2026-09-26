import { mdiCamera } from "@adaptive-ds/mdi/mdiCamera.js"
import { mdiCheck } from "@adaptive-ds/mdi/mdiCheck.js"
import { mdiHelp } from "@adaptive-ds/mdi/mdiHelp.js"
import { Link } from "@tanstack/solid-router"
import type { JSX, ParentComponent } from "solid-js"
import { For, Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import { Input } from "#ui/input/input/Input.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { SiteFrame } from "../components/SiteFrame.tsx"
import { UiContainer } from "../ui/UiContainer.tsx"
import { OrganizerEventDetailMobileNav } from "./OrganizerEventDetailMobileNav.tsx"
import type { OrganizerEventDetailPageState } from "./OrganizerEventDetailPageState.ts"

export function OrganizerEventDetailPage(props: {
  readonly state: OrganizerEventDetailPageState
  readonly frame?: ParentComponent
  readonly backHref?: string
  readonly allowReset?: boolean
  readonly mobileNavigation?: boolean
  readonly scannerSimulation?: JSX.Element
}) {
  const state = props.state

  return (
    <Dynamic component={props.frame ?? SiteFrame}>
      <main id="content" tabindex="-1" class="flex-1">
        <UiContainer
          width="wide"
          class={`flex min-w-0 flex-col gap-space-5 px-space-4 pt-space-6 sm:gap-space-6 sm:px-space-6 sm:pt-10 ${props.mobileNavigation ? "pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-10" : "pb-space-7 sm:pb-10"}`}
        >
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
                  <Link to={backHref()} class="focus-ring text-sm font-semibold text-brand-accent hover:underline">
                    ← {state.text().back}
                  </Link>
                )}
              </Show>
            </div>
            <p class="text-sm font-semibold uppercase tracking-widest text-brand-accent">Veranstaltung</p>
            <CardWrapper class="min-w-0 rounded-xl shadow-sm">
              <h1 class="text-2xl font-semibold tracking-tight text-content sm:text-4xl">
                {state.event()?.title ?? state.text().tickets}
              </h1>
            </CardWrapper>
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

          <CardWrapper id="organizer-scanner-card" class="flex min-w-0 flex-col gap-space-4 rounded-xl shadow-sm">
            <div class="flex min-w-0 items-center gap-space-3">
              <Button
                variant="outline"
                class="size-11 shrink-0 rounded-lg bg-surface-muted p-0"
                aria-label={state.text().scannerTitle}
                aria-expanded={state.scannerOpen()}
                aria-controls="organizer-scanner-panel"
                onClick={state.scannerToggle}
              >
                <Icon path={mdiCamera} />
              </Button>
              <label for="organizer-ticket-search" class="sr-only">
                {state.text().searchLabel}
              </label>
              <Input
                id="organizer-ticket-search"
                type="search"
                value={state.search()}
                placeholder={state.text().searchPlaceholder}
                onInput={(event) => state.searchChange(event.currentTarget.value)}
                class="min-h-11 min-w-0 flex-1 rounded-lg bg-surface"
              />
            </div>
            <Show when={state.scannerOpen()}>
              <div
                id="organizer-scanner-panel"
                class="flex min-w-0 flex-col gap-space-4 border-t border-border pt-space-4"
              >
                {props.scannerSimulation}
                <video
                  ref={state.scannerVideoSet}
                  autoplay
                  muted
                  playsinline
                  class="mx-auto aspect-video w-full max-w-[26rem] rounded-xl border border-border bg-slate-100 object-cover shadow-sm dark:bg-slate-900"
                  aria-label={state.text().scannerTitle}
                />
                <div class="flex flex-wrap items-center justify-end gap-space-3">
                  <Show when={state.scannerActive()}>
                    <p role="status" class="text-sm text-content-muted">
                      {state.scannerCheckingIn() ? state.text().scannerCheckingIn : state.text().scannerActive}
                    </p>
                  </Show>
                  <Button
                    variant={state.scannerActive() ? "outline" : undefined}
                    class="min-h-11 w-full rounded-lg sm:w-auto"
                    disabled={state.scannerStarting()}
                    onClick={() => (state.scannerActive() ? state.scannerStop() : void state.scannerStart())}
                  >
                    {state.scannerStarting()
                      ? state.text().scannerStarting
                      : state.scannerActive()
                        ? state.text().scannerStop
                        : state.text().scannerStart}
                  </Button>
                </div>
                <Show when={state.scannerErrorMessage()}>
                  <p
                    role="alert"
                    class="rounded-xl border border-danger/40 bg-danger-soft p-space-4 text-sm text-danger"
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
                          ? "rounded-xl border border-success/40 bg-success-soft p-space-4 text-sm text-success"
                          : "rounded-xl border border-danger/40 bg-danger-soft p-space-4 text-sm text-danger"
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
                      <div class="rounded-xl border border-warning/40 bg-warning-soft p-space-4 text-sm text-content">
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
                <form
                  aria-label="Ticket-Code manuell prüfen"
                  class="flex flex-col gap-space-3 rounded-xl border border-border bg-surface-muted p-space-4 sm:flex-row sm:items-end"
                  onSubmit={state.scannerCodeSubmit}
                >
                  <div class="min-w-0 w-full flex-1">
                    <label for="organizer-ticket-code" class="text-sm font-semibold text-content">
                      Ticket-Code
                    </label>
                    <Input
                      id="organizer-ticket-code"
                      name="ticket-code"
                      autocomplete="off"
                      class="mt-space-2 min-h-11 w-full rounded-lg bg-surface font-mono"
                    />
                  </div>
                  <Button
                    type="submit"
                    class="min-h-11 w-full rounded-lg sm:w-auto"
                    disabled={state.scannerCheckingIn()}
                  >
                    Ticket-Code prüfen
                  </Button>
                </form>
              </div>
            </Show>
          </CardWrapper>

          <div class="grid min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-space-5 sm:gap-space-6 lg:grid-cols-[minmax(18rem,0.85fr)_minmax(22rem,1.15fr)]">
            <div
              id="organizer-ticket-list"
              class="flex min-h-0 min-w-0 flex-col gap-space-4 rounded-xl border border-border bg-surface p-space-3 shadow-sm sm:p-space-4"
            >
              <Show
                when={state.tickets().length > 0 || !state.loading()}
                fallback={
                  <p role="status" class="py-space-8 text-center text-sm text-content-muted">
                    {state.text().loading}
                  </p>
                }
              >
                <Show
                  when={state.tickets().length > 0}
                  fallback={
                    <Show when={state.isDone()}>
                      <p class="py-space-8 text-center text-sm text-content-muted">{state.text().noTickets}</p>
                    </Show>
                  }
                >
                  <ul class="flex min-w-0 max-h-[36rem] flex-col gap-space-2 overflow-y-auto p-1">
                    <For each={state.tickets()}>
                      {(ticket) => (
                        <li class="min-w-0">
                          <Button
                            variant={state.selectedTicketId() === ticket.id ? "none" : "outline"}
                            class="h-auto min-h-16 w-full min-w-0 justify-between gap-space-3 rounded-lg px-space-3 py-space-3 text-left shadow-sm"
                            classList={{
                              "rounded-b-none border border-brand-accent bg-brand-soft":
                                state.selectedTicketId() === ticket.id,
                            }}
                            aria-expanded={state.selectedTicketId() === ticket.id}
                            aria-controls={`organizer-ticket-actions-${ticket.id}`}
                            onClick={() => state.ticketSelect(ticket)}
                          >
                            <span
                              role="img"
                              aria-label={
                                ticket.checkIn.status === "checked-in"
                                  ? state.text().checkedIn
                                  : ticket.checkIn.status === "checked-out"
                                    ? state.text().checkedOut
                                    : state.text().notCheckedIn
                              }
                              class={`inline-flex size-9 shrink-0 items-center justify-center rounded-control border ${
                                ticket.checkIn.status === "checked-in"
                                  ? "border-green-700 bg-green-100 text-green-800 dark:border-green-500 dark:bg-green-950 dark:text-green-300"
                                  : ticket.checkIn.status === "checked-out"
                                    ? "border-slate-700 bg-slate-200 text-slate-900 dark:border-slate-400 dark:bg-slate-800 dark:text-slate-100"
                                    : "border-amber-600 bg-amber-100 text-amber-900 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-200"
                              }`}
                            >
                              <Icon path={ticket.checkIn.status === "checked-in" ? mdiCheck : mdiHelp} class="size-5" />
                            </span>
                            <span class="min-w-0 flex-1">
                              <span class="block truncate font-semibold text-content">{ticket.participantName}</span>
                              <span class="block truncate text-xs text-content-muted">
                                {ticket.buyerName} · {ticket.ticketNumber}
                              </span>
                            </span>
                          </Button>
                          <Show when={state.selectedTicketId() === ticket.id}>
                            <div
                              id={`organizer-ticket-actions-${ticket.id}`}
                              class="flex flex-col gap-space-3 rounded-lg rounded-t-none border border-t-0 border-brand-accent bg-brand-soft p-space-4"
                            >
                              <div class="min-w-0">
                                <p class="font-semibold text-content">{ticket.participantName}</p>
                                <p class="break-all text-xs text-content-muted">{ticket.ticketNumber}</p>
                              </div>
                              <div class="flex flex-wrap gap-space-2">
                                <Button
                                  variant="filledGreen"
                                  class="min-h-11 min-w-0 flex-1 rounded-lg"
                                  disabled={
                                    state.actionPending() ||
                                    ticket.checkedIn ||
                                    ticket.cancelled ||
                                    ticket.paymentStatus !== "paid" ||
                                    ticket.orderStatus !== "paid"
                                  }
                                  onClick={() => void state.ticketCheckIn()}
                                >
                                  {state.actionPending() ? state.text().working : state.text().checkIn}
                                </Button>
                                <Show when={props.allowReset !== false}>
                                  <Button
                                    variant="contrast"
                                    class="min-h-11 min-w-0 flex-1 rounded-lg"
                                    disabled={state.actionPending() || !ticket.checkedIn}
                                    onClick={() => void state.ticketReset()}
                                  >
                                    {state.actionPending() ? state.text().working : state.text().reset}
                                  </Button>
                                </Show>
                              </div>
                            </div>
                          </Show>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
                <Show when={!state.isDone()}>
                  <div class="flex justify-center">
                    <Button
                      variant="outline"
                      class="min-h-11 rounded-lg"
                      disabled={state.loading()}
                      onClick={state.loadMore}
                    >
                      {state.loading() ? state.text().loading : state.text().loadMore}
                    </Button>
                  </div>
                </Show>
              </Show>
            </div>

            <CardWrapper class="min-w-0 rounded-xl shadow-sm sm:min-h-[16rem]">
              <Show
                when={state.selectedTicket()}
                fallback={
                  <p class="flex min-h-40 items-center justify-center text-center text-content-muted">
                    {state.text().selectTicket}
                  </p>
                }
              >
                {(ticket) => (
                  <div class="flex h-full flex-col gap-space-5 sm:gap-space-6">
                    <div class="flex flex-wrap items-start justify-between gap-space-3">
                      <div>
                        <p class="text-sm text-content-muted">{state.text().ticketNumber}</p>
                        <h2 class="break-all text-2xl font-semibold tracking-tight text-content">
                          {ticket().ticketNumber}
                        </h2>
                      </div>
                      <Badge variant={ticket().checkedIn ? "filledGreen" : "outline"} class="text-base">
                        {ticket().checkIn.status === "checked-in"
                          ? state.text().checkedIn
                          : ticket().checkIn.status === "checked-out"
                            ? state.text().checkedOut
                            : state.text().notCheckedIn}
                      </Badge>
                    </div>

                    <dl class="grid gap-space-4 rounded-xl bg-surface-muted p-space-4 sm:grid-cols-2">
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
                      <div class="rounded-xl border border-success/40 bg-success-soft p-space-4">
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
                        <div class="rounded-xl border border-warning/40 bg-warning-soft p-space-4 text-sm text-content">
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
                            class="min-h-12 w-full rounded-lg"
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
                        <Show when={props.allowReset !== false}>
                          <Button
                            variant="outline"
                            size="lg"
                            class="min-h-12 w-full rounded-lg"
                            disabled={state.actionPending()}
                            onClick={() => void state.ticketReset()}
                          >
                            {state.actionPending() ? state.text().working : state.text().reset}
                          </Button>
                        </Show>
                      </Show>
                    </div>
                  </div>
                )}
              </Show>
            </CardWrapper>
          </div>
        </UiContainer>
      </main>
      <Show when={props.mobileNavigation}>
        <OrganizerEventDetailMobileNav state={state} />
      </Show>
    </Dynamic>
  )
}
