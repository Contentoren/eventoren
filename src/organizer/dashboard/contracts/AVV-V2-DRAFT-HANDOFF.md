# AVV v2-Entwurf — Handoff

## Was liegt vor

- Neuer Entwurf: `src/organizer/dashboard/contracts/organizerContractDocuments.v2-draft.ts`
  (ein Export `organizerContractDocumentsV2Draft`, nur `dpa`, gleiche
  Abschnittsstruktur wie die Quelle plus Anlagen 1–3 als eigene Abschnitte).
- Live-Quelle `organizerContractDocuments.ts` ist unverändert
  (MUSTER-Revisionen `…-2026-10-21-v1` bleiben publiziert).
- Kennzeichnung im Entwurf: Titel und Abschnitt 1 sagen ausdrücklich
  „ENTWURF – keine Rechtsberatung“, nicht anwaltlich geprüft.

## Neue IDs/Revisionen (bestehendes Schema)

- `documentId`: `eventoren-veranstalter-avv-entwurf`
- `revision`: `eventoren-veranstalter-avv-entwurf-2026-10-22-v1`
- AGB (`terms`) unverändert; nur die AVV bekommt neue ID/Revision.
- Niemals publizierte Revisionen in place editieren — Textänderung = neue Revision.

## Was das Repo tatsächlich belegt (Anlagen 1–2)

- Convex-Backend (u. a. `convex.eventoren.de`), Cloudflare-Pages-Frontend mit
  SSR-Worker, Zitadel-OIDC (`https://auth.contentoren.de`), Stripe über
  Eventoren-Billing-Dienst (Modi `live`/`test`), nodemailer-SMTP
  (`AUTH_SMTP_*`, Absender `it@contentoren.de`), Resend-API für Rechnungsversand,
  Telegram-Bot für Auth-/Sicherheitsmeldungen.
- Kein Repo-Beleg für **Mailcow-/Linevast-Relays** gefunden (nur generisches
  SMTP + Resend) — Betreiber muss klären und Anlage 2 berichtigen.
- Betreiberidentität, alle Serverstandorte, AVV-Abdeckung der Subprozessoren,
  Stripe-Rollen/Transfergrundlage, SMTP-/Resend-Anbieter, Löschfristen und
  RPO/RTO sind im Repo nicht dokumentiert — im Entwurf als
  `[… zu ergänzen]`-Platzhalter markiert.

## Migration/Evidenz-Kompatibilität

- Alte Zustimmungen bleiben gültig: `organizerDashboardContractConsents` ist
  append-only (SHA-256 über `documentId`/`revision`/sections, UTC-Instant,
  Akteur); alte Zeilen ändern sich nie.
- Neue Zustimmungen erfordern neue Revisionen: Aktivierung erfordert den
  Code-Switch (`organizerContractDocuments.dpa` → neue IDs), danach greift
  `organizerContractsCurrentCheck` nur noch mit den neuen Revisionen.
  Kein Grandfathering (gilt auch hier: künftige Aktivierungen/Reaktivierungen
  schlagen ohne aktuelle Evidenz fehl; bereits aktive Orgs bleiben unberührt,
  bis eine Reaktivierung ansteht).
- Keine Bank-/PII-Daten im Entwurf; Audit-Notizen enthalten nur Revisions-IDs.

## Was ein Anwalt noch prüfen muss

1. Parteien, Vertretung, Betreiberanschrift; Rangfolge zu AGB.
2. Anlagen 1–3 vervollständigen (TOM-Wirksamkeit, Subprozessor-AVVs,
   Drittlandgrundlagen Art. 44 ff., insb. Stripe/USA).
3. Fristen festlegen: Widerspruchsfrist (Vorschlag 14 Tage), Vorfallmeldung
   (Vorschlag 24 h), Prüfungsvorlauf, Rückgabe-/Löschfrist (Vorschlag 30 Tage).
4. Rollenklärung: Zahlungsanbieter und Identitätsdienst (eigene
   Verantwortliche vs. Auftragsverarbeiter?), Telegram-Scope.
5. Spezifische Risiken (Einlass-/Scanner-Daten, Minderjährige als Teilnehmer,
   Aufbewahrungspflichten vs. Löschung) und Aufsichtsbehörden-Zuständigkeit.
6. Aktivierungs-Rollout: Zeitplan für Neu-Zustimmungen bestehender Orgs.

## Rollout 2026-10-23 — neue publizierte Revisionen (v1 ohne MUSTER/ENTWURF)

- `organizerContractDocuments.ts` publiziert neu:
  - AGB: `documentId` `eventoren-veranstalter-agb`, `revision`
    `eventoren-veranstalter-agb-2026-10-23-v1`, Titel `Veranstalter-AGB`
    (6 Abschnitte, Substanz der MUSTER-Fassung, Abschnitt 1 neu
    „1. Geltung und Parteien“).
  - AVV: `documentId` `eventoren-veranstalter-avv`, `revision`
    `eventoren-veranstalter-avv-2026-10-23-v1`, Titel
    `Auftragsverarbeitungsvereinbarung (AVV)` (10 Abschnitte auf Basis des
    ENTWURF-Inhalts: 7 Abschnitte + Anlagen 1–3 als Abschnitte 8–10,
    Abschnitt 1 neu „1. Gegenstand und Parteien“).
- Diese Revisionen supersedieren sowohl die MUSTER-Revisionen
  `…-2026-10-21-v1` als auch die ENTWURF-Revision
  `eventoren-veranstalter-avv-entwurf-2026-10-22-v1`; der
  ENTWURF-Stand in `organizerContractDocuments.v2-draft.ts` bleibt als
  Entwurfshistorie bestehen und wird nicht live referenziert.
- Alte Evidenz-Zeilen bleiben append-only gültig; neue Zustimmungen und
  künftige Aktivierungen/Reaktivierungen erfordern die neuen Revisionen
  (kein Grandfathering, bereits aktive Orgs bleiben bis zur nächsten
  Reaktivierung unberührt).
