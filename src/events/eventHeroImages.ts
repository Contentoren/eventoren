import type { EventHeroImage } from "./EventHeroImage.ts"
import { imageList } from "../app/assets/imageList.js"
import { urlImage } from "../app/assets/urlImage.js"

export const eventHeroImages: readonly EventHeroImage[] = [
  {
    src: urlImage(imageList.i1920x1080_webp_festival_lights),
    alt: "Festivalbühne bei Nacht mit beleuchteter Kuppel und Publikum",
    label: "Festival",
  },
  {
    src: urlImage(imageList.i1920x1080_webp_concert_crowd),
    alt: "Ausverkauftes Konzert mit feiernder Menge vor der Bühne",
    label: "Konzert",
  },
  {
    src: urlImage(imageList.i1920x1080_webp_dj_stage),
    alt: "DJ-Pult auf Festivalbühne mit blauen Lichtstrahlen",
    label: "DJ Stage",
  },
  {
    src: urlImage(imageList.i1920x1080_webp_stage_beams),
    alt: "Bühnenlichtstrahlen und Nebel über der Live-Crowd",
    label: "Stage Beams",
  },
  {
    src: urlImage(imageList.i1920x1080_webp_event_production),
    alt: "Bühnenlichter, Scheinwerfer und Konzerthalle im Nebel",
    label: "Production",
  },
]
