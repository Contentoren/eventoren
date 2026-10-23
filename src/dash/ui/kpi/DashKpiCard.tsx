import { mdiArrowTopRight } from "@adaptive-ds/mdi/mdiArrowTopRight.js"
import { Link } from "@tanstack/solid-router"
import { cn } from "cn"
import type { JSX } from "solid-js"
import { Show } from "solid-js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { Skeleton } from "#ui/static/skeleton/Skeleton.jsx"
import { StatCard } from "#ui/static/stat/StatCard.jsx"
import { dashKpiCardStateCreate } from "./dashKpiCardStateCreate.ts"

export interface DashKpiCardProps {
  label: string
  value: string
  icon: string
  delta?: number | null
  deltaInverted?: boolean
  deltaLabel?: string
  href?: string
  search?: Record<string, string | number>
  chart?: JSX.Element
  footer?: JSX.Element
  loading?: boolean
  class?: string
}

/** Dashboard-Kennzahlenkarte: StatCard, optional als Link, mit Chart-Slot unter dem Wert und Ladezustand. */
export function DashKpiCard(p: DashKpiCardProps) {
  const state = dashKpiCardStateCreate({
    href: () => p.href,
    search: () => p.search,
    delta: () => p.delta,
    deltaLabel: () => p.deltaLabel,
  })

  return (
    <Show
      when={p.loading !== true}
      fallback={
        <div
          class={cn(
            "flex h-full flex-col gap-1.5 rounded-card border border-border-subtle bg-surface p-4 sm:p-5",
            p.class,
          )}
          aria-busy="true"
        >
          <div class="flex items-center justify-between gap-2">
            <Skeleton class="h-4 w-20" />
            <Skeleton class="size-4 rounded" />
          </div>
          <Skeleton class="h-8 w-2/3" />
          <Skeleton class="h-2.5 w-24" />
        </div>
      }
    >
      <Show
        when={state.link()}
        fallback={
          <DashKpiCardBody
            label={p.label}
            value={p.value}
            icon={p.icon}
            delta={state.delta()}
            deltaInverted={p.deltaInverted}
            chart={p.chart}
            footer={p.footer}
            class={p.class}
          />
        }
      >
        {(link) => (
          <Link
            to={link().to}
            search={link().search}
            aria-label={`${p.label}: ${p.value}`}
            class={cn(
              "group relative block h-full rounded-card outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              p.class,
            )}
          >
            <span class="pointer-events-none absolute inset-0 rounded-card border border-transparent transition-colors group-hover:border-border-strong/40" />
            <DashKpiCardBody
              label={p.label}
              value={p.value}
              icon={p.icon}
              delta={state.delta()}
              deltaInverted={p.deltaInverted}
              chart={p.chart}
              footer={p.footer}
              class="pr-8"
            />
            <span class="absolute top-3 right-3 text-content-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <Icon path={mdiArrowTopRight} class="size-4" />
            </span>
          </Link>
        )}
      </Show>
    </Show>
  )
}

/**
 * Kartenkörper: StatCard plus Chart und Fußzeile direkt darunter.
 * Chart und Fußzeile werden ohne Bedingung gerendert (kein <Show> um
 * Prop-Elemente), weil bedingtes Lesen von JSX-Props die CSR-Hydration
 * bricht; undefined rendert beidseitig nichts.
 */
function DashKpiCardBody(p: {
  label: string
  value: string
  icon: string
  delta: { value: number; label: string } | null
  deltaInverted?: boolean
  chart?: JSX.Element
  footer?: JSX.Element
  class?: string
}) {
  return (
    <StatCard
      label={p.label}
      value={p.value}
      icon={p.icon}
      delta={p.delta}
      deltaInverted={p.deltaInverted}
      footer={
        <span class="flex flex-col gap-2">
          <span class="block h-10">{p.chart}</span>
          <span class="block">{p.footer}</span>
        </span>
      }
      class={p.class}
    />
  )
}
