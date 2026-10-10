# Freigabelinks für Ticket-Scanner

## Verhalten und Berechtigungen

Administratoren erstellen benannte Veranstalterlinks für explizit ausgewählte Events. Veranstalter- und Administratorlinks können benannte Helferlinks erzeugen; Helfer können Tickets suchen und einchecken, aber keine Links verwalten. Jeder Link hat ein Ablaufdatum. Check-ins werden dem Link und seinem Namen zugeordnet. Scanner- und Ticketfunktionen benötigen eine Internetverbindung.

Ein Link kann mehrere Events umfassen. Helferlinks sind auf den Eventumfang und die Laufzeit des Elternlinks begrenzt. Widerruf oder Ablauf des Elternlinks sperrt auch dessen Helferlinks.

Linkbasierte Ticket- und Scanner-Routen sind öffentlich erreichbar und getrennt von den Zitadel-geschützten Admin-/Organizer-Routen. Jede Anfrage prüft serverseitig den Linkstatus, Ablauf, Eventumfang und Elternlink.

## Sicherheit und Audit

Der Linkcode ist ein kryptografisch zufälliges Bearer-Geheimnis. Autorisierte Verwalter können ihn erneut anzeigen; er wird nicht in Logs geschrieben. Öffentliche Metadaten enthalten nur notwendige Link- und Eventnamen.

Ticketstatus und Check-in-Berechtigung werden serverseitig geprüft. Die Audit-Historie erfasst Linkidentität und Namen und bleibt mit der Benutzerhistorie kompatibel.

Administratoren verwalten Veranstalter- und Helferlinks zentral. Veranstalter verwalten Helferlinks aus ihrem Link nur innerhalb des erlaubten Event- und Zeitraums. Links lassen sich anzeigen, kopieren, öffnen und teilen; ein Widerruf ist wirksam, ohne die Zitadel-geschützten Routen oder deren Berechtigungen zu ändern.
