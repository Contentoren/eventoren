import { eventImageUrlGet } from "./eventImageUrlGet.ts"

export function EventDetailBanner(props: { imageUrl: string; imageAlt: string }) {
  return (
    <div class="relative w-full h-24 sm:h-auto sm:aspect-[21/9] sm:min-h-[420px] lg:min-h-[500px] max-h-[600px] overflow-hidden bg-black">
      <img
        src={eventImageUrlGet(props.imageUrl)}
        alt=""
        aria-hidden="true"
        class="absolute inset-0 size-full scale-110 object-cover blur-3xl"
      />
      <img
        src={eventImageUrlGet(props.imageUrl)}
        alt={props.imageAlt}
        width="1920"
        height="820"
        class="relative mx-auto h-full w-auto max-w-full object-contain [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]"
      />
    </div>
  )
}
