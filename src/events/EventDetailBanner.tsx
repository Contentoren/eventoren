export function EventDetailBanner(props: { imageUrl: string; imageAlt: string }) {
  return (
    <div class="relative w-full aspect-[21/9] min-h-[300px] sm:min-h-[420px] lg:min-h-[500px] max-h-[600px] overflow-hidden bg-black">
      <img src={props.imageUrl} alt={props.imageAlt} width="1920" height="820" class="size-full object-cover" />
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-x-0 top-0 h-28 bg-linear-to-b from-black/50 to-transparent"
      />
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-linear-to-t from-surface-base via-surface-base/40 to-transparent"
      />
    </div>
  )
}
