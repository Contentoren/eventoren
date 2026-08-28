import type { EventHeroPartner } from "./EventHeroPartner.ts"

export function eventHeroPartnersByKind(
  partners: readonly EventHeroPartner[],
  kind: EventHeroPartner["kind"],
): readonly EventHeroPartner[] {
  return partners.filter((partner) => partner.kind === kind)
}
