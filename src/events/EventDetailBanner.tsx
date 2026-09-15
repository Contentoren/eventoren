import { eventImageUrlGet } from "./eventImageUrlGet.ts"

export function EventDetailBanner(props: { imageUrl: string; imageAlt: string }) {
  return (
    <div class="relative w-full h-24 sm:h-auto sm:aspect-[21/9] sm:min-h-[420px] lg:min-h-[500px] max-h-[600px] overflow-hidden bg-black">
      <img
        src={eventImageUrlGet(props.imageUrl)}
        alt={props.imageAlt}
        width="1920"
        height="820"
        class="size-full object-cover"
      />
    </div>
  )
}
