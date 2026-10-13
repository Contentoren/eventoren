import { mdiCamera } from "@adaptive-ds/mdi/mdiCamera.js"
import { mdiCheck } from "@adaptive-ds/mdi/mdiCheck.js"
import { mdiHelp } from "@adaptive-ds/mdi/mdiHelp.js"
import { Link } from "@tanstack/solid-router"
import type { JSX, ParentComponent } from "solid-js"
import { For, Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import { Input } from "#ui/input/input/Input.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Details } from "#ui/interactive/details/Details.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { SiteFrame } from "../components/SiteFrame.tsx"
import { UiContainer } from "../ui/UiContainer.tsx"
import { OrganizerEventDetailMobileNav } from "./OrganizerEventDetailMobileNav.tsx"
import type { OrganizerEventDetailPageState } from "./OrganizerEventDetailPageState.ts"
import { OrganizerEventDetailProfile } from "./OrganizerEventDetailProfile.tsx"
import { organizerEventDetailPageViewStateCreate } from "./organizerEventDetailPageViewStateCreate.ts"

export function OrganizerEventDetailPage(props: {
  readonly state: OrganizerEventDetailPageState
  readonly frame?: ParentComponent
  readonly backHref?: string
  readonly allowReset?: boolean
  readonly mobileNavigation?: boolean
  readonly scannerSimulation?: JSX.Element
}) {
  const state = organizerEventDetailPageViewStateCreate({
    state: () => props.state,
    mobileNavigation: () => props.mobileNavigation,
  })

  return (
    <Dynamic component={props.frame ?? SiteFrame}>
      <main id="content" tabindex="-1" class="flex-1">
        <UiContainer
          width="wide"
          class={`flex min-w-0 flex-col gap-space-5 px-space-4 pt-space-6 sm:gap-space-6 sm:px-space-6 sm:pt-10 ${props.mobileNavigation ? "pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-10" : "pb-space-7 sm:pb-10"}`}
        >
          <Show when={state.profileVisible()}>
            <OrganizerEventDetailProfile />
          </Show>
          <Show when={!state.mobile()}>
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
              <CardWrapper class="min-w-0 rounded-xl border-0 shadow-lg shadow-slate-900/10 dark:shadow-black/30">
                <h1 class="text-2xl font-semibold tracking-tight text-content sm:text-4xl">
                  {state.event()?.title ?? state.text().tickets}
                </h1>
              </CardWrapper>
            </header>
          </Show>

          <Show when={!state.profileVisible()}>
            <Show when={(!state.mobile() || state.ticketsVisible()) && state.errorMessage()}>
              <p role="alert" class="rounded-control bg-danger-soft p-space-4 text-sm text-danger">
                {state.errorMessage()}
              </p>
            </Show>
            <Show when={(!state.mobile() || state.ticketsVisible()) && state.successMessage()}>
              <p role="status" class="rounded-control bg-success-soft p-space-4 text-sm text-success">
                {state.successMessage()}
              </p>
            </Show>

            <Show when={state.scannerVisible() || state.ticketsVisible()}>
              <CardWrapper
                id="organizer-scanner-card"
                class={`flex min-w-0 flex-col gap-space-4 rounded-xl border-0 shadow-lg shadow-slate-900/10 dark:shadow-black/30 ${state.mobile() && state.scannerVisible() ? "fixed inset-x-0 top-0 bottom-[calc(4.5rem_+_env(safe-area-inset-bottom))] z-20 overflow-hidden rounded-none bg-black p-0 shadow-none md:static" : ""}`}
              >
                <Show when={!state.mobile() || state.ticketsVisible()}>
                  <div class="flex min-w-0 items-center gap-space-3">
                    <Show when={!state.mobile()}>
                      <Button
                        variant="outline"
                        class="size-11 shrink-0 rounded-lg border-0 bg-surface-muted p-0 shadow-sm shadow-slate-900/5 dark:bg-slate-700 dark:shadow-black/20"
                        aria-label={state.text().scannerTitle}
                        aria-expanded={state.scannerOpen()}
                        aria-controls="organizer-scanner-panel"
                        onClick={state.scannerToggle}
                      >
                        <Icon path={mdiCamera} />
                      </Button>
                    </Show>
                    <label for="organizer-ticket-search" class="sr-only">
                      {state.text().searchLabel}
                    </label>
                    <Input
                      id="organizer-ticket-search"
                      type="search"
                      value={state.search()}
                      placeholder={state.text().searchPlaceholder}
                      onInput={(event) => state.searchChange(event.currentTarget.value)}
                      class="min-h-11 min-w-0 flex-1 rounded-lg border-0 bg-surface-muted/70 shadow-sm shadow-slate-900/5 dark:bg-slate-800/80 dark:shadow-black/20"
                    />
                  </div>
                </Show>
                <Show when={state.scannerVisible()}>
                  <div
                    id="organizer-scanner-panel"
                    class={`flex min-w-0 flex-col gap-space-4 rounded-xl bg-surface-muted/50 p-space-4 dark:bg-slate-800/50 ${state.mobile() ? "absolute inset-0 justify-center rounded-none bg-black p-0 dark:bg-black" : ""}`}
                  >
                    <Show when={!state.mobile()}>{props.scannerSimulation}</Show>
                    <video
                      ref={state.scannerVideoSet}
                      autoplay
                      muted
                      playsinline
                      class={`mx-auto aspect-video w-full max-w-[26rem] rounded-xl bg-slate-100 object-cover shadow-md shadow-slate-900/10 dark:bg-slate-900 dark:shadow-black/30 ${state.mobile() ? "absolute inset-0 h-full max-w-none rounded-none bg-black shadow-none" : ""}`}
                      aria-label={state.text().scannerTitle}
                    />
                    <Show when={state.mobile() && state.scannerErrorMessage()}>
                      <p
                        role="alert"
                        class="absolute left-4 right-4 top-4 z-10 rounded-xl bg-danger-soft/95 p-space-4 text-center text-sm text-danger shadow-lg"
                      >
                        {state.scannerErrorMessage()}
                      </p>
                    </Show>
                    <Show when={state.mobile() && state.scannerOutcome()}>
                      {(outcome) => (
                        <p
                          role={outcome().kind === "success" ? "status" : "alert"}
                          class={`absolute left-4 right-4 top-1/2 z-10 -translate-y-1/2 rounded-xl p-space-4 text-center text-base font-semibold shadow-lg backdrop-blur-sm ${outcome().kind === "success" ? "bg-success-soft/95 text-success" : "bg-danger-soft/95 text-danger"}`}
                        >
                          {outcome().kind === "success" ? "Ticket erfolgreich eingecheckt" : outcome().message}
                        </p>
                      )}
                    </Show>
                    <div
                      class={`flex flex-wrap items-center justify-end gap-space-3 ${state.mobile() ? "hidden" : ""}`}
                    >
                      <Show when={state.scannerActive()}>
                        <p role="status" class="text-sm text-content-muted">
                          {state.scannerCheckingIn() ? state.text().scannerCheckingIn : state.text().scannerActive}
                        </p>
                      </Show>
                      <Button
                        variant={state.scannerActive() ? "outline" : undefined}
                        class="min-h-11 w-full rounded-lg border-0 shadow-sm shadow-slate-900/5 dark:shadow-black/20 sm:w-auto"
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
                    <Show when={!state.mobile() && state.scannerErrorMessage()}>
                      <p role="alert" class="rounded-xl bg-danger-soft p-space-4 text-sm text-danger">
                        {state.scannerErrorMessage()}
                      </p>
                    </Show>
                    <Show when={!state.mobile() && state.scannerOutcome()}>
                      {(outcome) => (
                        <div
                          role={outcome().kind === "success" ? "status" : "alert"}
                          class={
                            outcome().kind === "success"
                              ? "rounded-xl bg-success-soft p-space-4 text-sm text-success"
                              : "rounded-xl bg-danger-soft p-space-4 text-sm text-danger"
                          }
                        >
                          <p class="font-semibold">{outcome().message}</p>
                          <p class="mt-1 break-all font-mono text-xs">{outcome().code}</p>
                        </div>
                      )}
                    </Show>
                    <Show when={!state.mobile() && state.scannerOutcome()?.kind === "denied"}>
                      <Show when={state.duplicateInfo()}>
                        {(duplicate) => (
                          <div class="rounded-xl bg-warning-soft p-space-4 text-sm text-content">
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
                      class={`flex flex-col gap-space-3 rounded-xl bg-surface p-space-4 shadow-sm shadow-slate-900/5 dark:bg-slate-900/80 dark:shadow-black/20 sm:flex-row sm:items-end ${state.mobile() ? "hidden" : ""}`}
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
                          class="mt-space-2 min-h-11 w-full rounded-lg border-0 bg-surface-muted/70 font-mono shadow-sm shadow-slate-900/5 dark:bg-slate-800 dark:shadow-black/20"
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
            </Show>

            <Show when={state.ticketsVisible()}>
              <div class="grid min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-space-5 sm:gap-space-6 lg:grid-cols-[minmax(18rem,0.85fr)_minmax(22rem,1.15fr)]">
                <div
                  id="organizer-ticket-list"
                  class="flex min-h-0 min-w-0 flex-col gap-space-4 rounded-xl bg-surface p-space-3 shadow-lg shadow-slate-900/10 dark:shadow-black/30 sm:p-space-4"
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
                                class="h-auto min-h-16 w-full min-w-0 justify-between gap-space-3 rounded-lg border-0 px-space-3 py-space-3 text-left aria-[expanded=false]:bg-surface-muted/65 dark:aria-[expanded=false]:bg-slate-800/70"
                                classList={{
                                  "rounded-b-none bg-brand-soft": state.selectedTicketId() === ticket.id,
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
                                  class={`inline-flex size-9 shrink-0 items-center justify-center rounded-control ${
                                    ticket.checkIn.status === "checked-in"
                                      ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                                      : ticket.checkIn.status === "checked-out"
                                        ? "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                                        : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                                  }`}
                                >
                                  <Icon
                                    path={ticket.checkIn.status === "checked-in" ? mdiCheck : mdiHelp}
                                    class="size-5"
                                  />
                                </span>
                                <span class="min-w-0 flex-1">
                                  <span class="block truncate font-semibold text-content">
                                    {ticket.participantName}
                                  </span>
                                  <span class="block truncate text-xs text-content-muted">
                                    {ticket.buyerName} · {ticket.ticketNumber}
                                  </span>
                                </span>
                              </Button>
                              <Show when={state.selectedTicketId() === ticket.id}>
                                <div
                                  id={`organizer-ticket-actions-${ticket.id}`}
                                  class="flex flex-col gap-space-3 rounded-lg rounded-t-none bg-brand-soft p-space-4"
                                >
                                  <Show
                                    when={ticket.checkedIn}
                                    fallback={
                                      <Button
                                        variant="filledGreen"
                                        class="min-h-11 w-full rounded-lg [.admin-workspace_&]:disabled:bg-slate-200 [.admin-workspace_&]:disabled:text-slate-700 dark:[.admin-workspace_&]:disabled:bg-slate-700 dark:[.admin-workspace_&]:disabled:text-slate-200"
                                        disabled={
                                          state.actionPending() ||
                                          ticket.cancelled ||
                                          ticket.paymentStatus !== "paid" ||
                                          ticket.orderStatus !== "paid"
                                        }
                                        onClick={() => void state.ticketCheckIn()}
                                      >
                                        {state.actionPending() ? state.text().working : state.text().checkIn}
                                      </Button>
                                    }
                                  >
                                    <Show when={props.allowReset !== false}>
                                      <Button
                                        variant="contrast"
                                        class="min-h-11 w-full rounded-lg"
                                        disabled={state.actionPending() || ticket.cancelled}
                                        onClick={() => void state.ticketReset()}
                                      >
                                        {state.actionPending() ? state.text().working : state.text().reset}
                                      </Button>
                                    </Show>
                                  </Show>
                                  <Show when={state.mobile()}>
                                    <Details
                                      title="Weitere Informationen"
                                      class="min-w-0 border-0 bg-surface shadow-none dark:bg-slate-800"
                                      summaryClass="min-h-11 flex-row p-space-3 text-content [&_h3]:text-base"
                                    >
                                      <div class="flex min-w-0 flex-col gap-space-4 p-space-4 pt-0 text-sm text-content">
                                        <Show when={ticket.participantNameSource === "buyer"}>
                                          <p class="text-warning">{state.text().participantFallback}</p>
                                        </Show>
                                        <dl class="grid gap-space-3 sm:grid-cols-2">
                                          <div>
                                            <dt class="text-content-muted">{state.text().buyerEmail}</dt>
                                            <dd class="break-all">{ticket.buyerEmail}</dd>
                                          </div>
                                          <div>
                                            <dt class="text-content-muted">{state.text().price}</dt>
                                            <dd>{state.currency(ticket.priceCents)}</dd>
                                          </div>
                                          <div>
                                            <dt class="text-content-muted">{state.text().checkedInAt}</dt>
                                            <dd>
                                              {ticket.checkedIn
                                                ? state.dateTime(ticket.checkedInAt)
                                                : state.text().notCheckedIn}
                                            </dd>
                                          </div>
                                          <Show when={ticket.checkedIn}>
                                            <div>
                                              <dt class="text-content-muted">{state.text().operator}</dt>
                                              <dd>{ticket.checkedInByName ?? state.text().unknown}</dd>
                                            </div>
                                          </Show>
                                        </dl>
                                        <div class="flex flex-wrap gap-space-2">
                                          <Badge
                                            variant={
                                              ticket.paymentStatus === "paid" && ticket.orderStatus === "paid"
                                                ? "filledGreen"
                                                : "filledYellow"
                                            }
                                            class="border-0"
                                          >
                                            {ticket.paymentStatus === "paid" && ticket.orderStatus === "paid"
                                              ? state.text().paid
                                              : state.text().unpaid}
                                          </Badge>
                                          <Badge variant={ticket.cancelled ? "filledRed" : "outline"} class="border-0">
                                            {ticket.cancelled ? state.text().cancelled : state.text().valid}
                                          </Badge>
                                        </div>
                                        <Show when={state.duplicateInfo()}>
                                          {(duplicate) => (
                                            <div class="rounded-xl bg-warning-soft p-space-4">
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
                                                  <dd class="break-all">
                                                    {duplicate().buyerName} · {duplicate().buyerEmail}
                                                  </dd>
                                                </div>
                                              </dl>
                                            </div>
                                          )}
                                        </Show>
                                      </div>
                                    </Details>
                                  </Show>
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
                          class="min-h-11 rounded-lg border-0 bg-surface-muted shadow-sm shadow-slate-900/5 dark:bg-slate-800 dark:shadow-black/20"
                          disabled={state.loading()}
                          onClick={state.loadMore}
                        >
                          {state.loading() ? state.text().loading : state.text().loadMore}
                        </Button>
                      </div>
                    </Show>
                  </Show>
                </div>
                <Show when={!state.mobile()}>
                  <CardWrapper class="min-w-0 rounded-xl border-0 shadow-lg shadow-slate-900/10 dark:shadow-black/30 sm:min-h-[16rem]">
                    <Show
                      when={state.selectedTicket()}
                      fallback={
                        <p class="flex min-h-40 items-center justify-center text-center text-content-muted max-sm:[.admin-workspace_&]:min-h-0 max-sm:[.admin-workspace_&]:py-space-2 max-sm:[.admin-workspace_&]:text-sm">
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
                            <Badge
                              variant={ticket().checkedIn ? "filledGreen" : "outline"}
                              class={
                                ticket().checkedIn
                                  ? "border-0 text-base"
                                  : "border-0 bg-surface-muted text-base dark:bg-slate-800"
                              }
                            >
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
                              class="border-0"
                            >
                              {ticket().paymentStatus === "paid" && ticket().orderStatus === "paid"
                                ? state.text().paid
                                : state.text().unpaid}
                            </Badge>
                            <Badge
                              variant={ticket().cancelled ? "filledRed" : "outline"}
                              class={ticket().cancelled ? "border-0" : "border-0 bg-surface-muted dark:bg-slate-800"}
                            >
                              {ticket().cancelled ? state.text().cancelled : state.text().valid}
                            </Badge>
                          </div>

                          <Show when={ticket().checkedIn}>
                            <div class="rounded-xl bg-success-soft p-space-4">
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
                              <div class="rounded-xl bg-warning-soft p-space-4 text-sm text-content">
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
                                  class="min-h-12 w-full rounded-lg border-0 bg-surface-muted shadow-sm shadow-slate-900/5 dark:bg-slate-800 dark:shadow-black/20 [.admin-workspace_&]:disabled:bg-slate-200 [.admin-workspace_&]:disabled:text-slate-700 dark:[.admin-workspace_&]:disabled:bg-slate-700 dark:[.admin-workspace_&]:disabled:text-slate-200"
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
                                  class="min-h-12 w-full rounded-lg border-0 bg-surface-muted shadow-sm shadow-slate-900/5 dark:bg-slate-800 dark:shadow-black/20"
                                  disabled={state.actionPending() || ticket().cancelled}
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
                </Show>
              </div>
            </Show>
          </Show>
        </UiContainer>
      </main>
      <Show when={props.mobileNavigation}>
        <OrganizerEventDetailMobileNav state={state} />
      </Show>
    </Dynamic>
  )
}
