import { cn } from "cn"
import type { Component, ComponentProps } from "solid-js"
import { splitProps } from "solid-js"

const Table: Component<ComponentProps<"table">> = (p) => {
  const [s, rest] = splitProps(p, ["class"])
  return (
    <div class={"relative w-full overflow-auto"}>
      <table class={cn("w-full caption-bottom text-sm", s.class)} {...rest} />
    </div>
  )
}

const TableHeader: Component<ComponentProps<"thead">> = (p) => {
  const [s, rest] = splitProps(p, ["class"])
  return <thead class={cn("[&_tr]:border-b", s.class)} {...rest} />
}

const TableBody: Component<ComponentProps<"tbody">> = (p) => {
  const [s, rest] = splitProps(p, ["class"])
  return <tbody class={cn("[&_tr:last-child]:border-0", s.class)} {...rest} />
}

const TableFooter: Component<ComponentProps<"tfoot">> = (p) => {
  const [s, rest] = splitProps(p, ["class"])
  return <tfoot class={cn("bg-primary text-primary-foreground font-medium", s.class)} {...rest} />
}

const TableRow: Component<ComponentProps<"tr">> = (p) => {
  const [s, rest] = splitProps(p, ["class"])
  return (
    <tr class={cn("hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors", s.class)} {...rest} />
  )
}

const TableHead: Component<ComponentProps<"th">> = (p) => {
  const [s, rest] = splitProps(p, ["class"])
  return (
    <th
      class={cn(
        "text-muted-foreground h-12 px-4 text-left align-middle font-medium [&:has([role=checkbox])]:pr-0",
        s.class,
      )}
      {...rest}
    />
  )
}

const TableCell: Component<ComponentProps<"td">> = (p) => {
  const [s, rest] = splitProps(p, ["class"])
  return <td class={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", s.class)} {...rest} />
}

const TableCaption: Component<ComponentProps<"caption">> = (p) => {
  const [s, rest] = splitProps(p, ["class"])
  return <caption class={cn("text-muted-foreground mt-4 text-sm", s.class)} {...rest} />
}

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow }
