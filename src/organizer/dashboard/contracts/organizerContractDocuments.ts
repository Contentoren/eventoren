/** Immutable contract documents. Changes require NEW document IDs/revisions, never an edit in place. */
export const organizerContractDocuments = {
  terms: {
    documentId: "eventoren-veranstalter-agb",
    revision: "eventoren-veranstalter-agb-2026-10-23-v1",
    title: "Veranstalter-AGB",
    sections: [
      [
        "1. Geltung und Parteien",
        "Dieser Vertrag wird geschlossen zwischen dem Betreiber der Eventoren-Plattform und der im Dashboard benannten Veranstalter-Organisation, vertreten durch die zustimmende Person. Noch nicht anwaltlich geprüft — keine Rechtsberatung. Betreiberidentität, Leistungsumfang und Konditionen müssen vor produktivem Einsatz verbindlich geprüft und ergänzt werden. Diese Bedingungen sind keine Käufer-AGB.",
      ],
      [
        "2. Leistungen und Verantwortung",
        "Eventoren stellt technische Funktionen zur Verwaltung von Veranstaltungen, Tickets und Bestellungen bereit. Der Veranstalter bleibt für Veranstaltung, Inhalte, Berechtigungen, Preise, Steuern, Sicherheitsmaßnahmen, Durchführung und die Erfüllung seiner Pflichten gegenüber Besuchern verantwortlich. Ein Anspruch auf bestimmte Verfügbarkeit oder einen bestimmten Verkaufserfolg wird hier nicht zugesagt.",
      ],
      [
        "3. Konto, Gebühren und Abrechnung",
        "Die vertretungsberechtigte Person hält Organisations- und Kontaktdaten aktuell und schützt Zugänge. Gebühren, Kostenträger und Abrechnungsbedingungen sind gesondert transparent zu vereinbaren; eine Dashboard-Konfiguration allein ersetzt keine Preisvereinbarung. Bankdaten dürfen nur durch berechtigte Personen geändert werden.",
      ],
      [
        "4. Datenschutz und Mitwirkung",
        "Die Parteien beachten das geltende Datenschutzrecht. Soweit Eventoren personenbezogene Daten im Auftrag verarbeitet, gilt die gesonderte AVV. Der Veranstalter sorgt für Rechtsgrundlagen, Informationspflichten und rechtmäßige Weisungen. Sicherheitsvorfälle und unberechtigte Zugriffe sind unverzüglich gegenseitig mitzuteilen.",
      ],
      [
        "5. Laufzeit, Sperrung und Ende",
        "Die Zusammenarbeit beginnt mit ausdrücklicher Zustimmung; die technische Freischaltung erfolgt erst nach Prüfung. Bei Rechtsverstößen oder Sicherheitsrisiken kann der Zugang eingeschränkt werden. Beendigung, Datenexport, offene Abrechnungen und Löschfristen sind vor produktiver Nutzung gesondert zu regeln. Gesetzliche Aufbewahrungspflichten bleiben unberührt.",
      ],
      [
        "6. Haftung und Änderungen",
        "Es gelten die gesetzlichen Haftungsregeln; dieser Vertrag enthält keinen pauschalen Haftungsausschluss. Neue Vertragsfassungen werden gesondert bereitgestellt und erfordern eine neue ausdrückliche Zustimmung. Schweigen, Migration oder Nutzung gelten nicht als Zustimmung zu einer neuen Fassung.",
      ],
    ],
  },
  dpa: {
    documentId: "eventoren-veranstalter-avv",
    revision: "eventoren-veranstalter-avv-2026-10-23-v1",
    title: "Auftragsverarbeitungsvereinbarung (AVV)",
    sections: [
      [
        "1. Gegenstand und Parteien",
        "Noch nicht anwaltlich geprüft — keine Rechtsberatung. Diese Auftragsverarbeitungsvereinbarung nach Art. 28 DSGVO wird geschlossen zwischen der im Dashboard benannten Veranstalter-Organisation als Verantwortlichem (Art. 4 Nr. 7 DSGVO) und [BETREIBER: Name, Rechtsform, Anschrift, Vertretung — vom Betreiber zu ergänzen] als Auftragsverarbeiter (Art. 4 Nr. 8 DSGVO). Sie regelt die Verarbeitung personenbezogener Daten im Rahmen der Eventoren-Veranstalterfunktionen (Verwaltung von Veranstaltungen, Bestellungen, Tickets, Einlass und Kommunikation). Sie gilt erst nach anwaltlicher Prüfung, Vervollständigung der Anlagen 1–3 und ausdrücklicher Zustimmung zur unten genannten Revision; sie ist keine Zusicherung einer bereits geprüften DSGVO-Konformität.",
      ],
      [
        "2. Zweck, Dauer und Daten",
        "Zweck ist die technische Verwaltung von Veranstaltungen, Bestellungen, Tickets, Einlass (einschließlich Scanner-Freigaben) und veranstaltungsbezogener Kommunikation im Auftrag des Veranstalters. Betroffene Personengruppen: Besucher und Besteller (Gast-Checkout mit Vorname, Nachname, E-Mail-Adresse, optional Telefonnummer, Teilnehmername je Ticket, Veranstaltungs-, Ticketstufen-, Mengen- und Bestellinformationen), Organisationsmitglieder und Kontaktpersonen des Veranstalters (Kontakt- und Rollendaten einschließlich Veranstalterrolle inhaber/admin/eventmanager/finanzen/einlass sowie Authentifizierungs- und Sitzungsdaten), sowie Empfänger veranstaltungsbezogener E-Mails (Ticketbestätigungen, Rechnungen, Einladungen). Besondere Kategorien personenbezogener Daten nach Art. 9 DSGVO sind nicht vorgesehen und dürfen nicht verarbeitet werden. Die Verarbeitung dauert für die vereinbarte Leistungserbringung; danach gelten Abschnitt 7 sowie vereinbarte Rückgabe- und Löschfristen [FRISTEN vom Betreiber zu konkretisieren]. Zahlungsdaten (z. B. Stripe-Zahlungszuordnungen, Rechnungsdaten) werden nur im für Abwicklung, Zuordnung und gesetzliche Pflichten erforderlichen Umfang verarbeitet.",
      ],
      [
        "3. Weisungen und Vertraulichkeit",
        "Der Auftragsverarbeiter verarbeitet personenbezogene Daten nur auf dokumentierte Weisung des Verantwortlichen, einschließlich Weisungen zu Übermittlungen in Drittländer; dies gilt nicht, soweit ihn eine gesetzliche Pflicht zur Verarbeitung trifft (dann Informationspflicht nach Art. 28 Abs. 3 DSGVO). Weisungen erfolgen über die dafür vorgesehenen Dashboard-Funktionen (Konfiguration, Freigabe-/Sperrprozesse, Supportwege) und werden nachvollziehbar dokumentiert. Hält der Auftragsverarbeiter eine Weisung für rechtswidrig, informiert er den Verantwortlichen unverzüglich und setzt die Verarbeitung bis zur Klärung nur fort, soweit dies zur Gefahrenabwehr oder aus gesetzlichen Gründen erforderlich ist. Alle mit der Verarbeitung befassten Personen sind zur Vertraulichkeit verpflichtet (Art. 28 Abs. 3 lit. b, Art. 29, 32 Abs. 4 DSGVO); Zugriffe sind auf das für die jeweilige Aufgabe Erforderliche zu begrenzen (Need-to-know, Veranstalterrollenmodell).",
      ],
      [
        "4. Sicherheit — zu konkretisierende Anlage",
        "Der Auftragsverarbeiter trifft die technischen und organisatorischen Maßnahmen nach Art. 32 DSGVO gemäß Anlage 1 (TOM). Dazu gehören derzeit insbesondere: rollenbasierte Zugriffskontrolle (Veranstalterrollen inhaber/admin/eventmanager/finanzen/einlass, serverseitige Rechteprüfung in jeder Backend-Funktion), Anmeldung über OpenID Connect (derzeit konfigurierter Aussteller https://auth.contentoren.de), HttpOnly-Sitzungscookies mit SameSite=Lax und begrenzter Laufzeit, verschlüsselte Übertragung (TLS; SMTP mit requireTLS und Zertifikatsprüfung), Speicherung aller Zeitstempel in UTC mit Anzeige in Europe/Berlin, sowie Protokollierung und Verfahren zur Wiederherstellung. Anlage 1 beschreibt den konkret vereinbarten Stand; sie ist vom Betreiber vor produktivem Einsatz zu prüfen, zu vervollständigen und regelmäßig auf Wirksamkeit zu überprüfen. Diese Aufzählung ist kein Nachweis bereits auditierter Maßnahmen.",
      ],
      [
        "5. Unterauftragsverarbeiter und Drittlandtransfer",
        "Die Beauftragung weiterer Auftragsverarbeiter (Unterauftragsverarbeiter) bedarf der vorherigen gesonderten oder allgemeinen schriftlichen Genehmigung des Verantwortlichen (Art. 28 Abs. 2 DSGVO). Bei allgemeiner Genehmigung informiert der Auftragsverarbeiter rechtzeitig über jede beabsichtigte Änderung (Hinzufügung oder Ersetzung) und räumt dem Verantwortlichen eine Widerspruchsmöglichkeit von mindestens [FRIST — vom Betreiber festzulegen, Vorschlag: 14 Tage] ein. Unterauftragsverarbeiter werden mit gleichwertigen Datenschutzpflichten nach Art. 28 Abs. 4 DSGVO verpflichtet. Die vereinbarte Liste ergibt sich aus Anlage 2 (derzeit: Convex-Backend, Cloudflare-Pages-Hosting, Zahlungsabwicklung über den Eventoren-Billing-Dienst mit Stripe, E-Mail-Versand über konfigurierten SMTP-Dienst und Resend, Identitätsdienst auth.contentoren.de, Sicherheitsbenachrichtigungen über Telegram — Einzelheiten und offene Betreiberangaben siehe Anlage 2). Übermittlungen in Drittländer erfolgen nur unter den Voraussetzungen der Art. 44 ff. DSGVO; die jeweilige Grundlage ergibt sich aus Anlage 3. Ohne wirksame Transfergrundlage unterbleibt die Übermittlung.",
      ],
      [
        "6. Unterstützung, Vorfälle und Kontrolle",
        "Der Auftragsverarbeiter unterstützt den Verantwortlichen im Rahmen seiner Möglichkeiten bei der Wahrnehmung von Betroffenenrechten (Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch), bei Meldungen und Konsultationen nach Art. 33–36 DSGVO sowie bei Datenschutz-Folgenabschätzungen und vorherigen Konsultationen. Verletzungen des Schutzes personenbezogener Daten meldet er dem Verantwortlichen unverzüglich, möglichst innerhalb von [FRIST — Vorschlag: 24 Stunden] nach Bekanntwerden, mit allen verfügbaren Angaben nach Art. 33 Abs. 3 DSGVO und ergänzt diese fortlaufend. Er stellt dem Verantwortlichen alle erforderlichen Informationen zum Nachweis der Einhaltung des Art. 28 DSGVO zur Verfügung und ermöglicht angemessene Überprüfungen einschließlich Inspektionen durch den Verantwortlichen oder einen beauftragten Prüfer nach rechtzeitiger Ankündigung [VORLAUFFRIST vom Betreiber festzulegen] und unter Rücksicht auf laufende Betriebe und Geschäftsgeheimnisse Dritter.",
      ],
      [
        "7. Ende der Verarbeitung",
        "Nach Ende der Leistungserbringung gibt der Auftragsverarbeiter nach Wahl des Verantwortlichen alle personenbezogenen Daten heraus oder löscht sie und löscht bestehende Kopien, sofern keine gesetzliche Aufbewahrungspflicht (z. B. handels-/steuerrechtliche Fristen für Abrechnungs- und Zahlungsdaten) entgegensteht. Hinweis aus dem Bestand: Stripe-Finanzhistorie (Charges, Invoices, Payment Intents) sowie abrechnungsrelevante Nachweise können gesetzlichen Aufbewahrungspflichten unterliegen und werden nicht ohne Rechtsgrundlage gelöscht. Rückgabeformat (Vorschlag: strukturierter, maschinenlesbarer Export), Fristen ([vom Betreiber zu konkretisieren, Vorschlag: 30 Tage]) und Nachweisverfahren sind vor produktivem Einsatz zu vereinbaren. Gesetzliche Aufbewahrungspflichten bleiben unberührt; nach deren Ablauf erfolgt die Löschung unverzüglich. Weisungen und durchgeführte Maßnahmen sind nachvollziehbar zu dokumentieren; die Zustimmungsnachweise (Consent-Evidence mit SHA-256-Digests) bleiben als Rechenschaftsnachweise erhalten.",
      ],
      [
        "8. Anlage 1 — Technische und organisatorische Maßnahmen (TOM) [vom Betreiber zu prüfen/ergänzen]",
        "Stand laut Repository-Befund (kein Auditnachweis): (a) Zugangskontrolle: serverseitige Rechteprüfung je Backend-Funktion, Veranstalterrollen inhaber/admin/eventmanager/finanzen/einlass, nur der inhaber darf Verträge für eine bestehende Organisation annehmen; (b) Authentifizierung: OpenID-Connect-Anmeldung (konfiguriert: https://auth.contentoren.de), Sitzung über HttpOnly-Cookie eventoren-session (SameSite=Lax, 30 Tage), Login-/Logout-Hilfscookies mit kurzer Laufzeit; (c) Übertragung/Transport: TLS für Web und API, SMTP mit requireTLS und rejectUnauthorized:true; (d) Datenhaltung: Convex-Backend als persistence layer, UTC-Speicherung, append-only Consent-Evidence (SHA-256 über documentId/Revision/sections, UTC-Instant, Akteur) und revisionsgebundene Aktivierungsprüfung ohne Bestandskunden-Grandfathering; (e) E-Mail: nodemailer-SMTP (Absender it@contentoren.de) und Resend-API für Rechnungsversand, idempotente Zustellung; (f) Trennung: Demo-State ist von Live-Ticketdaten getrennt. VOM BETREIBER ZU ERGÄNZEN: Server-/Rechenzentrumsstandorte, Verschlüsselung ruhender Daten, Backup- und Wiederherstellungsziele (RPO/RTO), Logging-Umfang und -fristen, Schwachstellen- und Patchprozess, Löschkonzept und -fristen je Datenkategorie, Verfahren zur regelmäßigen Wirksamkeitsprüfung nach Art. 32 Abs. 1 lit. d DSGVO.",
      ],
      [
        "9. Anlage 2 — Unterauftragsverarbeiter [vom Betreiber zu bestätigen/vervollständigen]",
        "Derzeit aus dem Repository belegte Dienste (Vertragsstatus, Standorte und AVV-Abdeckung jeweils OFFEN und vom Betreiber zu klären): (1) Convex (Convex-Backend/persistence layer, öffentliche Adresse u. a. convex.eventoren.de — Betreiber/Standort/AVV offen); (2) Cloudflare (Pages-Hosting und SSR-Worker des Frontends — AVV/Standort offen); (3) Zahlungsabwicklung über den Eventoren-Billing-Dienst mit Stripe (Produktionsbeispielkonfiguration Stripe-Modus live; Testobjekte im Stripe-Testmodus; konkrete Anbieterrolle, verarbeitete Zahlungsdaten, Fristen offen); (4) E-Mail-Versand: konfigurierter SMTP-Dienst (ENV AUTH_SMTP_HOST/USER/PASS, Absender it@contentoren.de) sowie Resend-API (AUTH_RESEND_API_KEY) für Rechnungsversand — Anbieter, Standort und AVV jeweils offen; (5) Identitätsdienst: OpenID-Connect-Aussteller https://auth.contentoren.de (Zitadel-Anbindung für Rollensynchronisation — Betreiber, Rolle, Standort, AVV offen); (6) Telegram-Bot für Auth-/Sicherheitsbenachrichtigungen — zu prüfen, ob personenbezogene Daten übermittelt werden, ggf. streichen oder AVV/Grundlage ergänzen. HINWEIS: Für „Mailcow-/Linevast-Relays“ findet sich im Repository kein Beleg (nur generisches SMTP und Resend); der Betreiber klärt, ob und welche Relay-Anbieter tatsächlich eingesetzt werden, und ergänzt sie hier mit Leistung, Standort und AVV-Status. Änderungen dieser Liste folgen dem Genehmigungs- und Widerspruchsverfahren aus Abschnitt 5.",
      ],
      [
        "10. Anlage 3 — Drittlandtransfers [vom Betreiber zu vervollständigen]",
        "Übermittlungen in Drittländer (außerhalb EU/EWR) erfolgen nur bei Vorliegen einer Grundlage nach Art. 44 ff. DSGVO (Angemessenheitsbeschluss, Standardvertragsklauseln, oder sonstige geeignete Garantien bzw. Ausnahmen nach Art. 49 DSGVO). Bekannte Klärungsfälle: Stripe (Sitz USA — Transfergrundlage vom Betreiber zu benennen und hier einzutragen); Resend (Sitz/Verarbeitungsorte vom Betreiber zu benennen); Convex-/Cloudflare-Verarbeitungsorte (vom Betreiber zu benennen); Telegram (Sitz/Verarbeitung — falls im Scope, hier einzutragen, sonst aus Anlage 2 streichen). Solange eine Transfergrundlage für einen Dienst fehlt, darf dieser Dienst nicht für die Auftragsverarbeitung eingesetzt werden. Der Betreiber pflegt diese Anlage aktuell und informiert den Verantwortlichen vorab über neue Drittlandbezüge im Verfahren nach Abschnitt 5.",
      ],
    ],
  },
} as const
