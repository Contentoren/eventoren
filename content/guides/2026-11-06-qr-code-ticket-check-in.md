---
title: "QR Code Ticket Check-in Without an App: 2026 Door Guide"
seoTitle: "QR Code Ticket Check-in Without an App (2026)"
description: "QR code ticket check-in explained: how validation stops duplicate scans, app vs browser scanners, hardware, connectivity, fallbacks and a helper briefing."
publishedAt: "2026-11-06"
slug: "qr-code-ticket-check-in"
author: "Eventoren Editorial Team"
image: "ratgeber-einlasskontrolle-qr-code"
imageAlt: "A young volunteer with a teal lanyard scans a guest's smartphone ticket at the door of a small clubhouse at dusk"
category: "on-the-day"
keywords:
  [
    "event check in qr code",
    "ticket scanner",
    "check in system",
    "qr code ticket check in",
    "ticket scanner app",
    "browser ticket scanner",
    "event entry scanning",
  ]
translationKey: "qr-check-in"
---

QR code ticket check-in works like this: every ticket carries a unique, unguessable code; at the door a phone camera or scanner reads it, the ticketing system checks it against the live database and marks it as used. Any second scan of the same code is rejected. You don't necessarily need an app for this: browser-based scanners open from a link in the phone's camera view, at the cost of needing an internet connection throughout. This guide covers how validation works, app versus browser scanning, hardware, connectivity, fallbacks and a ready-to-use helper briefing, as of November 2026.

> **Key takeaways**
>
> - A QR ticket is only as safe as its validation: the code must be checked against one central record, so a copied screenshot gets in once and only once.
> - App scanners can often work offline but must be installed and logged in on every device. Browser scanners need no install but need internet for every scan.
> - Ordinary smartphones are fine for most small and mid-sized events. Dedicated readers pay off with big crowds, short entry windows or harsh light.
> - Plan connectivity like power: two independent routes (venue Wi-Fi plus mobile data on a different network), tested at the real time of day.
> - Every door needs a fallback (manual code entry, name lookup, a printed list) and a ten-minute briefing so helpers never argue at the scan line.

## What is QR code ticket check-in?

**QR code ticket check-in** is an entry process in which a machine-readable code on each ticket is scanned at the door and validated in real time against the ticketing system, which then records the ticket as checked in. The guest shows the ticket on a phone or on paper, the helper points a camera or scanner at it, and within a moment the screen shows "valid" or a rejection reason.

Compared with paper tickets, stamps or tear-off stubs, a scanned QR ticket gives you three things:

- **Protection against copies.** A forwarded screenshot works for exactly one person. Everyone after that is rejected.
- **Live numbers.** You see how many guests are inside while doors are still open, often per entrance and ticket type.
- **Fewer arguments.** The system decides, not a helper's gut feeling.

QR check-in is one part of a bigger door plan. Lanes, arrival peaks and staffing are covered in our guide to [event entry queue management](/en/guides/event-entry-queue-management).

## How does a QR ticket get validated?

Behind each beep there are four steps. Helpers who understand them handle problems calmly.

1. **A unique code is issued.** At purchase, the system generates a random code for every single ticket. It sits in the QR code and usually also appears as printed characters below it.
2. **The code is read.** A camera or scanner decodes the QR code and sends the content to the system.
3. **The code is checked.** Does it exist? Does it belong to this event? Has it been cancelled or refunded? Has it already been scanned?
4. **The status changes.** If all is fine, the ticket is stored as checked in with time and entrance. Every later scan returns "already checked in".

### What do the rejection messages mean?

| Message on the scanner | What it means                                      | What the helper does                                             |
| ---------------------- | -------------------------------------------------- | ---------------------------------------------------------------- |
| Valid                  | Ticket exists, belongs to this event, not used yet | Let the guest in, hand out a wristband if you use them           |
| Already checked in     | This code has been scanned before                  | Name the time of the first scan, send the guest to the help desk |
| Wrong event            | Genuine ticket, different date or event            | Point to the date on the ticket, send to the help desk           |
| Not found              | The code doesn't exist in the system               | Rescan, then type the code manually, then help desk              |
| Cancelled              | The ticket was refunded or voided                  | Do not admit, point to the box office                            |

The rule that keeps lines moving: **the scan line never argues.** Anything that isn't "valid" goes to a separate help desk.

### Why does central validation matter so much?

A QR code can be copied endlessly. Security doesn't come from the code itself but from one shared record of which codes have been used. That's why all entrances must work against the same live data. If two doors scan without a shared state, the same copy can get in twice, once at each door.

## App or browser scanner: which is better?

There are two ways to turn a phone into a ticket scanner. Neither is "best"; they suit different events.

|                                   | App-based scanner                                                                                | Browser-based scanner (link)                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Setup per device                  | Download from the app store, log in, select the event                                            | Open a link, allow camera access                                        |
| Volunteers' own phones            | Needs storage, an account and an OS version the app supports                                     | Works in a current mobile browser, nothing left on the phone afterwards |
| Offline use                       | Often possible: some apps download the ticket list and sync later                                | Not possible: every scan is checked online                              |
| Duplicate protection across doors | Live when online; offline devices sync later, so a copy can slip through at two doors in the gap | Live at every door, as long as the connection holds                     |
| External barcode readers          | Often supported                                                                                  | Depends on the provider                                                 |
| Revoking access                   | Remove the user account                                                                          | Revoke or stop sharing the link                                         |
| Best fit                          | Remote sites with poor coverage, large teams on company devices                                  | Clubs, schools, volunteer crews, last-minute extra lanes                |

As an example of the app route, Ticket Tailor advertises a free iOS and Android check-in app that also works offline and connects to external scanners (as of November 2026). Weezevent offers its WeezAccess app and dedicated access-control devices, and its own guidance mentions renting 4G dongles as an internet backup.

The honest trade-off: **an offline-capable app protects you against a network outage; a browser link protects you against setup chaos.** If your venue has reliable coverage and your helpers are volunteers using their own phones, the browser route is usually smoother. If you run a field festival with patchy signal, an offline-capable app or a dedicated network is the safer choice.

## What hardware do you need for QR check-in?

| Option                                    | Suits                                                                        | Strengths                              | Weaknesses                                  |
| ----------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------- |
| Smartphone camera (app or browser)        | Club nights, school events, concerts up to a few hundred guests per entrance | No purchase, helpers know their device | Focus delay, glare, battery drain           |
| Handheld scanner or rugged scanning phone | Concerts, festivals, short entry windows                                     | Faster reads, works in harsh light     | Cost, must be compatible with your software |
| Tablet on a stand                         | Conferences, self check-in                                                   | Big screen, guest can scan themselves  | Space, guests need instructions             |
| Turnstile with reader                     | Pools, museums, stadiums                                                     | Unstaffed, permanent                   | Expensive, installation required            |

How fast is each option? Vendors publish rough figures, for example around 400 scans per hour for a smartphone and around 800 for a laser scanner ([Snapticket entry calculator](https://go.snapticket.de/einlassmanagement)). The UK guide site tickts.co.uk puts a QR scanning point at roughly 300 to 400 people per hour, falling to about 200 with bag searches. Treat these as **assumptions, not measurements**; time one lane for five minutes at your next event.

## How do you plan internet at the entrance?

Online scanners check every ticket against the server. If the network fails, entry stops. Treat **internet at the door as critical infrastructure**, like power and lighting.

| Situation                     | Risk                                                     | What to do                                                 |
| ----------------------------- | -------------------------------------------------------- | ---------------------------------------------------------- |
| Basement venue, old building  | Weak or no mobile signal                                 | Use venue Wi-Fi, test on site beforehand                   |
| Open-air site, festival field | Mobile network overloads when thousands of phones arrive | Dedicated router with SIM, or a professional event network |
| Venue with public guest Wi-Fi | Guests saturate the network                              | Separate, hidden network for the door only                 |
| Small clubhouse               | One router, single point of failure                      | Second route: a hotspot on a different mobile operator     |

Practical rules:

- **Two independent routes.** One Wi-Fi network and one hotspot on a different mobile operator.
- **Test at the real time.** A network that is empty at 3 p.m. can be full at 8 p.m.
- **Prepare devices.** Mobile data on, data saver off, Wi-Fi password saved, long screen-lock timeout.
- **Don't advertise guest Wi-Fi at the door.** Ask guests to open their ticket before they queue.

## What is your fallback when something fails?

1. **Camera won't read the code:** type the characters printed under the QR code.
2. **Guest bought a ticket but can't find it:** search by name or email at the help desk and check them in there.
3. **A phone dies:** take the spare device from the help desk, or send the scanner link to another helper.
4. **One lane loses signal:** switch to the backup hotspot, close the lane briefly, send guests to neighbouring lanes.
5. **Total network outage:** the door manager decides. Either pause entry and inform the queue, or admit guests after a visual ticket check against a printed attendee export, noting ticket numbers so that later copies stand out. Check them in once the connection is back.
6. **Guests without tickets:** guest list and box office run in separate lanes. See [guest list management](/en/guides/guest-list-management) and [box office and door sales](/en/guides/box-office-door-sales).

Write the sequence on a card for each lane. Nobody improvises well under pressure.

### How do you scan in sun, darkness and with cracked screens?

- **Sunlight:** stand with your back to the sun so the guest's phone is in your shadow, and ask for brightness up.
- **Club lighting:** light the entrance brightly; no strobes or coloured light at the scan line.
- **Display problems:** cracked screens call for manual entry. If the code is small, ask the guest to zoom the PDF; 15 to 25 cm usually works better than very close.
- **Paper tickets:** no folds through the code and no lamination, because reflections block the camera.

## How many people do you need at the door?

Each lane needs at least one scanner. Around that, plan these roles:

| Role             | Task                                                  | Useful from (rule of thumb)                       |
| ---------------- | ----------------------------------------------------- | ------------------------------------------------- |
| Scanner          | Scan, announce the result                             | Always                                            |
| Queue walker     | Ask "ticket ready?" along the line                    | About 2 lanes                                     |
| Help desk        | Duplicates, unknown codes, name searches, guest list  | About 100 guests                                  |
| Bag or age check | Separate from scanning so the lane never stops        | When licence conditions or youth rules require it |
| Door manager     | Watch numbers, open and close lanes, decide incidents | About 3 lanes or 500 guests                       |

These thresholds are experience-based orientation, not regulation. Your venue's licence or safety plan always takes priority.

## What does a 10-minute helper briefing look like?

Use this template as it stands. It fits on one page and works for first-time volunteers.

| Minute | Topic               | Content                                                                                              |
| ------ | ------------------- | ---------------------------------------------------------------------------------------------------- |
| 0–1    | Overview            | Doors time, expected guests, who the door manager is, where the help desk is                         |
| 1–3    | Open the scanner    | Open the link or app, choose the entrance, scan the test ticket, set brightness and screen lock      |
| 3–5    | Messages            | Valid: let in. Already checked in, wrong event, not found, cancelled: send politely to the help desk |
| 5–6    | Manual entry        | Type the code under the QR when the camera fails                                                     |
| 6–7    | Special cases       | Guest list, plus-ones, concession proof, wheelchair users and companions                             |
| 7–8    | Network and battery | Which Wi-Fi, which hotspot, where the power banks and the spare phone are                            |
| 8–9    | Emergencies         | Network outage, crowding, medical incidents, who decides                                             |
| 9–10   | Tone                | Greeting, "please have your ticket open", neutral wording for rejections                             |

**Three lines for the scan line:**

- "Hi, could you open your ticket for me? Brightness up, please."
- "This ticket has already been scanned. Could you pop over to the help desk? They'll sort it out."
- "The camera can't read it, I'll just type the code in."

Brief at the actual entrance with the real devices. Each helper scans the test ticket once and sees the duplicate message once.

### Pre-event check-in checklist

- [ ] Entrances defined: main, guest list, box office, accessible
- [ ] Number of lanes calculated from guests, entry window and your scan-rate assumption
- [ ] Scanner access created and named per entrance and device
- [ ] Test ticket scanned end to end, duplicate rejection confirmed
- [ ] Network tested at the entrance on two routes
- [ ] Power banks, cables and one spare phone per two lanes
- [ ] Printed attendee export and guest list for emergencies, stored out of public view
- [ ] Guest email sent: doors time, "open your ticket before the queue", brightness up

## How to do this with Eventoren

Eventoren's door check-in needs no app. In the dashboard you create **scanner links**, for example one per device and entrance, and share them with your helpers. A helper opens the link in their smartphone browser and scans with the camera. If the camera can't read a code, they can **enter it manually**.

Be clear about the limit: the Eventoren scanner **needs internet** for every scan. There is no offline mode, no native app and no wallet pass. Plan Wi-Fi and a backup mobile route as described above.

When a scan is rejected, the scanner shows the reason, so helpers can send the guest straight to the help desk. In the dashboard you see **check-in statistics per entrance and ticket type**, which tells you which lane needs reinforcement. Guests receive their tickets by email as a PDF with a QR code and can show it on their phone or print it. There is a dedicated team role for entry staff. The interface is in German; questions about setup go through the [contact page](/kontakt). The German version of this guide is [Einlasskontrolle mit QR-Code](/ratgeber/einlasskontrolle-qr-code) (in German).

## Frequently asked questions

### Can someone get in with a screenshot of a QR ticket?

Yes, a screenshot carries the same code as the original and scans normally. Because the system marks each code as used on the first scan, only one person gets in with it. Every further copy is rejected as already checked in.

### Do I need a ticket scanner app for event check-in?

No. Many platforms offer an app, others a browser scanner that runs from a link in the phone's camera view. Browser scanners save the installation but need a connection for every scan. Some apps can scan offline and sync later.

### How many guests can one phone check in per hour?

It depends on light, how prepared guests are and whether bag or ID checks happen at the same spot. Published vendor and guide figures range from about 300 to 400 scans per hour for a phone, roughly 800 for a laser scanner and about 200 per lane with bag searches. Measure your own rate and plan with a buffer.

### What happens if the internet fails at the entrance?

With an online scanner, tickets can no longer be validated. Switch to your second network route first. If that fails too, the door manager decides between a short pause and a visual check against a printed list with later check-in.

### How long should I keep check-in data?

Check-in logs are personal data when tickets carry names. Under the GDPR's storage-limitation and data-minimisation principles, delete scan logs that you don't need for tax or accounting once their purpose is fulfilled, for example after settlement. Our [GDPR guide for event organisers](/en/guides/gdpr-for-event-organisers) covers retention in more depth.

## Sources

- [Ticket Tailor: free check-in app](https://www.tickettailor.com/free-checkin-app)
- [Weezevent: how to improve check-in and access control](https://weezevent.com/en-gb/blog/check-in-access-control-attendees/)
- [Tickts: how to manage event queues and entry flow](https://tickts.co.uk/blog/how-to-manage-event-queues-entry-flow)
- [Snapticket: entry calculator with scanner benchmarks](https://go.snapticket.de/einlassmanagement)
- [Regulation (EU) 2016/679 (GDPR), Art. 5](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng)
