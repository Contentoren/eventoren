# Öffentliche Veranstalter-Erklärungen

`/veranstalter-vertrag-beenden`: zweistufiger Widerruf / ordentliche oder außerordentliche Kündigung ohne Anmeldung. Pflichtangaben sind Name/Firma, E-Mail, frei eingegebene Vertrags-/Organisationsreferenz; ein Kündigungsdatum bleibt ein Kalenderdatum. UTC-Eingang, Anzeige ausdrücklich Europe/Berlin. Keine Änderung an Organisationen, Rollen, Verträgen oder Aktivierungsstatus; rechtliche Prüfung bleibt beim Betreiber.

`organizerTerminationRequestSchema` ist die gemeinsame verbindliche Validierung für Web, Convex, Hono und damit alle API-Oberflächen. Der dünne Draft-Wrapper erlaubt unvollständige Formulare. Öffentliche Mutation atomar persistiert unveränderliche Erklärung plus separaten Versandauftrag und Scheduler-Job. Identische Wiederholung mit demselben kryptografischen 256-Bit-Request-Key liefert denselben Beleg; abweichende Daten/Token werden abgelehnt. Der unabhängige 256-Bit-Receipt-Token ist zusätzlich für die Live-Query und Retry nötig. Kein Lookup über E-Mail, Organisation oder Beleg-ID, keine öffentlichen Listen.

SMTP: `auth/convex/email/authEmailSend`, vollständige Erklärung, Beleg-ID und Eingang an Eingebenden und `kontakt@semesterkur.de`. Pro Empfänger Versandstatus, bis zu acht automatische Versuche mit Backoff, Crash-Watchdog und tokengebundener manueller Retry nach fünf Minuten. SMTP ist grundsätzlich at-least-once: bei Prozessabbruch nach SMTP-Annahme vor Status-Persistenz kann eine Bestätigung doppelt kommen. `sent` bedeutet SMTP-Annahme, keine Garantie gegen spätere Bounces. Versandfehler ändern nicht den bereits gespeicherten Eingang. Keine echten Testmails versendet.

## Oberflächen

- Convex live: `organizerTermination:organizerTerminationReceiptQuery`.
- Hono POST `/api/veranstalter-vertrag-beenden`: `{operation: "submit"|"receipt"|"retry", args: {...}}`; maximal 16 KiB, `no-store`. Receipt-Zugangsdaten ausschließlich im Body, nicht URL/Referrer.
- TS: bestehender Export `apiClientConvexCall({module:"organizerTermination", name:"organizerTerminationSubmitMutation", args})`; Query/Retry analog.
- CLI: `eventoren convex-call organizerTermination:organizerTerminationSubmitMutation --json '{...}'`; Query/Retry analog.
- MCP: registriertes `convex-call`, Modul `organizerTermination`, entsprechender Funktionsname. Interne Versandfunktionen bleiben gesperrt.

Bewusste Abweichung: keine zusätzlichen speziellen CLI-/SDK-/MCP-Wrapper, da der generierte gemeinsame Convex-Katalog diese Funktionen bereits bereitstellt und Convex dieselbe Valibot-Quelle erneut validiert. HTTP ist ein separater öffentlicher Hono-Endpunkt, nicht das authentifizierte Dashboard. Die bestehenden auth-gebundenen queryCreate/mutationCreate werden bewusst nicht verwendet; der Webclient nutzt für diese öffentliche Funktion eine native tokengebundene Convex-Live-Subscription ohne Sitzung.

Vor Freigabe Backend deployen und SMTP-Konfiguration verifizieren. Kein Deployment/Serverstart/Commit durch diesen Teilauftrag.
