---
title: "Event Entry Management: Calculate and Cut Queues (2026)"
seoTitle: "Event Entry Management: Calculate Queues"
description: "Event entry management with a throughput formula: worked examples for 300, 1,000 and 3,000 guests, arrival peaks, lanes, bag checks and guest communication."
publishedAt: "2026-11-06"
slug: "event-entry-queue-management"
author: "Eventoren Editorial Team"
image: "ratgeber-einlassmanagement-warteschlangen"
imageAlt: "Elevated view of several entry lanes separated by crowd barriers outside a concert hall, with guests moving forward quickly in the evening sun"
category: "on-the-day"
keywords:
  [
    "event entry management",
    "queue management events",
    "event entry lanes",
    "how many ticket scanners",
    "entry throughput",
    "event check in queue",
    "bag check event entry",
  ]
translationKey: "entry-queues"
---

Event entry management means working out in advance how many guests per minute your entrances can process, then setting up lanes, staff and communication so that the arrival peak never exceeds that rate. The core formula is simple: **lanes needed = peak arrivals per minute ÷ guests per lane per minute**, rounded up. Combine it with a realistic arrival curve and you know before doors open whether your queue will last 5 minutes or 45. Below we calculate it for 300, 1,000 and 3,000 guests and show which levers actually shorten queues, as of November 2026.

> **Key takeaways**
>
> - Entry time in minutes = guests ÷ (lanes × scans per lane per minute). For the peak: lanes = peak arrivals per minute ÷ scans per lane per minute.
> - Guests don't arrive evenly. Plan for the busiest 15 to 45 minutes, not the average across the whole doors window.
> - The slowest step sets the pace: bag searches, ID checks and wristbands need their own capacity, calculated separately.
> - Separate lanes for guest list, box office and accessible entry keep the main ticket lanes fast.
> - Telling guests "open your ticket before you queue" is the cheapest speed-up you'll ever buy.

## What is event entry management?

**Event entry management** is the planning and control of everything between a guest arriving at your site and stepping into the event area: approach routes, queues, ticket validation, bag and age checks, special cases and communication. Its goal is safe, fast and fair access.

Ticket scanning is only one part of it. How the scan itself works, which hardware to use and how to brief helpers is covered in [QR code ticket check-in without an app](/en/guides/qr-code-ticket-check-in). This guide answers the question before that: **how many lanes do you need, and when will it get tight?**

Long queues are more than an annoyance. A queue that spills onto a pavement or road becomes a safety issue, and venue licences and national assembly rules often set conditions for escape routes and stewarding. In Germany, for example, the model venue regulation applies to rooms for more than 200 visitors and requires a safety concept for venues with more than 5,000 places. Rules differ by country and region, so check your licence conditions.

## How do you calculate entry throughput?

Three formulas cover almost every planning question:

| Formula                                                      | Answers                                               |
| ------------------------------------------------------------ | ----------------------------------------------------- |
| Entry time (min) = guests ÷ (lanes × scans per lane per min) | How long until everyone is in, if arrivals were even? |
| Lanes = guests ÷ (scans per lane per min × target minutes)   | How many lanes for a given doors window?              |
| Lanes = peak arrivals per min ÷ scans per lane per min       | How many lanes so the queue doesn't grow at the peak? |

Always **round lanes up**.

When the peak exceeds your capacity, the queue grows by the difference every minute:

- **Backlog after the peak** = (arrivals per min − capacity per min) × peak minutes
- **Extra wait for the last person** ≈ backlog ÷ capacity per min

### Which scan rate should you assume?

The scan rate is the most important and least certain number. Published figures vary: one vendor puts a smartphone at about 400 scans per hour and a laser scanner at about 800 ([Snapticket](https://go.snapticket.de/einlassmanagement)); the UK guide site tickts.co.uk states roughly 300 to 400 per hour for a QR scanning point, dropping to about 200 per lane with bag searches. Real doors are slower than demos because guests hunt for emails, phones are dim and someone always has a question.

For the examples below we use three **assumptions**, not measurements:

| Assumption  | Scans per lane per minute | Situation                                                                     |
| ----------- | ------------------------- | ----------------------------------------------------------------------------- |
| A: cautious | 4                         | Phone camera, many unprepared guests, exceptions handled at the lane          |
| B: normal   | 6                         | Phone camera, guests prepared, separate help desk                             |
| C: fast     | 10                        | Dedicated handheld readers, well-prepared guests, no other checks at the lane |

Measure your own: count successful scans at one lane for five minutes at your next event. That number beats any table.

## Worked examples: 300, 1,000 and 3,000 guests

### Step 1: the even-arrival view

These figures assume guests arrive evenly, which they don't, but it's the baseline. Minutes are rounded up.

**300 guests (club night, school prom, community concert)**

| Lanes | A (4/min) | B (6/min) | C (10/min) |
| ----- | --------- | --------- | ---------- |
| 1     | 75 min    | 50 min    | 30 min     |
| 2     | 38 min    | 25 min    | 15 min     |
| 3     | 25 min    | 17 min    | 10 min     |

**1,000 guests (concert hall, gala, carnival session)**

| Lanes | A (4/min) | B (6/min) | C (10/min) |
| ----- | --------- | --------- | ---------- |
| 3     | 84 min    | 56 min    | 34 min     |
| 4     | 63 min    | 42 min    | 25 min     |
| 6     | 42 min    | 28 min    | 17 min     |
| 8     | 32 min    | 21 min    | 13 min     |

**3,000 guests (festival day, arena show)**

| Lanes | A (4/min) | B (6/min) | C (10/min) |
| ----- | --------- | --------- | ---------- |
| 8     | 94 min    | 63 min    | 38 min     |
| 12    | 63 min    | 42 min    | 25 min     |
| 16    | 47 min    | 32 min    | 19 min     |
| 20    | 38 min    | 25 min    | 15 min     |

### Step 2: plan for the peak

Now add an arrival-peak **assumption** for each size and calculate lanes from the peak rate.

| Event                                    | Peak assumption                | Peak arrivals per min | Lanes at A | Lanes at B | Lanes at C |
| ---------------------------------------- | ------------------------------ | --------------------- | ---------- | ---------- | ---------- |
| 300 guests, doors 60 min before start    | 50 % arrive in the last 30 min | 150 ÷ 30 = 5          | 2          | 1          | 1          |
| 1,000 guests, doors 60 min before start  | 60 % arrive in the last 30 min | 600 ÷ 30 = 20         | 5          | 4          | 2          |
| 3,000 guests, gates 2 h before headliner | 50 % arrive in a 45 min wave   | 1,500 ÷ 45 = 33.3     | 9          | 6          | 4          |

Worked through for 1,000 guests at assumption B: 20 ÷ 6 = 3.3, so **4 lanes**. With only 2 lanes (12 per minute), the queue grows by 8 guests every minute. After the 30-minute peak, 8 × 30 = 240 people are still waiting, and the last of them waits about 240 ÷ 12 = 20 extra minutes. Your show starts late.

For 3,000 guests, don't calculate one big number. Split the calculation **per entrance**, because guests rarely spread evenly across gates. If 60 % use the gate nearest the station, that gate needs 60 % of the lanes.

### Step 3: add the roles around the lanes

| Event size | Scanners (assumption B) | Queue walkers | Help desk | Door manager         | Total entry crew |
| ---------- | ----------------------- | ------------- | --------- | -------------------- | ---------------- |
| 300        | 1 + 1 reserve           | 0 to 1        | 1         | Help desk doubles up | 3 to 4           |
| 1,000      | 4 + 1 reserve           | 2             | 1 to 2    | 1                    | 9 to 10          |
| 3,000      | 6 + 2 reserve           | 3             | 2 to 3    | 1 + 1 per gate       | 15 to 18         |

This is an example staffing plan, not a standard, and it excludes security staff. Bag checks come on top.

## Why does the arrival curve matter more than the average?

Guests come in waves: a calm start after doors, a steep peak shortly before the main act, then a tail. If more guests arrive per minute in that peak than your lanes can handle, the queue grows even though the average looked fine. Weezevent's access-control guidance makes the same point: a headline act creates a peak half an hour to an hour before it starts.

### Typical arrival patterns

| Event type                       | Typical pattern                                                      | Planning tip                                                 |
| -------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------ |
| Concert, theatre, fixed start    | Steep peak in the last 20 to 30 min                                  | Plan lanes for the peak, add a support act                   |
| Club night                       | Flat, spread over hours, later peak                                  | Fewer lanes, staffed for longer                              |
| Gala, prom, wedding-style events | Peak right after doors for the welcome drink, groups arrive together | Scan groups together, keep the photo wall away from the door |
| Festival arrival day             | Waves after shuttles and trains                                      | Know the timetable, open lanes per wave                      |
| Conference                       | Peak 15 min before the keynote                                       | Open earlier, serve coffee after entry                       |

These patterns are experience, not statistics. If your ticketing system stores check-in times, read your real curve from the last event.

### How do you flatten the peak?

- **A reason to come early:** welcome drink until 19:30, support act, DJ set, photo booth.
- **Time slots per ticket type:** "Standing from 18:30, seated from 19:15" for big shows.
- **Clear entrance allocation:** by ticket type or block, printed on the ticket and in the info email.
- **Doors and start time stated separately:** "Doors 19:00, show 20:00" beats "20:00".

## Which separate lanes do you need?

Every exception at the main lane costs time for everyone behind it. Separate by effort:

| Lane              | For                                                                 | Why separate                           |
| ----------------- | ------------------------------------------------------------------- | -------------------------------------- |
| Main ticket lanes | Guests with a valid ticket                                          | Fastest flow: scan only                |
| Guest list        | Artists, press, plus-ones, promoter guests                          | A name search takes longer than a scan |
| Box office        | Guests who still need to buy                                        | Buying takes minutes, not seconds      |
| Accessible entry  | Wheelchair users, people with limited mobility, buggies, companions | Step-free, uncrowded, more space       |
| Help desk         | Duplicates, unknown codes, payment problems                         | Takes arguments out of the lanes       |

At small events one person can cover several roles, but keep the box office **physically apart** from scanning. How to set it up is explained in [box office and door sales](/en/guides/box-office-door-sales), and the name-list side in [guest list management](/en/guides/guest-list-management).

### How do you plan accessible entry?

- A step-free, signposted route from car park or stop to the entrance.
- A dedicated lane or priority without guests having to justify themselves.
- A clear rule for companion tickets, if you offer them.
- A scanner within reach from a seated position, or a helper who brings the device.
- Information in advance: where the accessible entrance is, whether there's a quiet area, whom to ask.

## How do bag checks and ID checks change the numbers?

The slowest station sets the pace. If a bag search happens at the scan point, your rate drops from assumption B to A or below.

The ticketing provider Simpleticket publishes planning values for security checks: about 10 seconds per visitor for light checks, 20 for normal and 30 for strict ones. Treat these as planning **assumptions** and convert them into a per-checker rate:

| Check level | Seconds per visitor | Guests per checker per min | Checkers for 20 arrivals/min |
| ----------- | ------------------- | -------------------------- | ---------------------------- |
| Light       | 10                  | 6                          | 4                            |
| Normal      | 20                  | 3                          | 7                            |
| Strict      | 30                  | 2                          | 10                           |

For the 1,000-guest example with a peak of 20 per minute, a normal bag check needs **7 checkers** in front of 4 scan lanes. Plan fewer and the bag check becomes your queue.

Practical rules:

1. **Order the stations:** bag check, then scan, then wristband, each at its own position.
2. **Calculate every station:** the formula applies to each step. The step with the lowest total capacity is your bottleneck.
3. **Prepare guests:** "small bags only, A4 maximum" in the info email; cloakroom after entry, not before.
4. **ID in hand:** for age-restricted events, ask guests to have ID ready in the queue.
5. **Space behind the door:** if the bar or cloakroom sits right behind the entrance, the queue backs up inside.

Weezevent recommends Z-shaped barriers for long queues and placing the search area before ticket control, with mixed-gender search teams. Your security provider and licence conditions decide the details.

## How do you communicate with guests before and at entry?

Most seconds at the door are lost because guests aren't ready.

**Info email or post 1 to 3 days before**

- [ ] Doors time and start time, stated separately
- [ ] Which entrance for whom: tickets, guest list, box office, accessible
- [ ] "Open your ticket before you queue, brightness up, PDF or printout"
- [ ] Bag policy, prohibited items, ID for age limits
- [ ] Travel, parking and the expected peak ("it gets busy from 19:30")

**On site**

- [ ] Signs readable from the back of the queue: "Tickets", "Guest list", "Box office"
- [ ] A queue walker asking "ticket ready?"
- [ ] Honest updates during delays: estimated wait and reason
- [ ] Social media or the event page for last-minute changes

## What if the queue keeps growing?

Set escalation steps in advance so your door manager doesn't improvise:

| Level | Trigger (example)                           | Action                                                    |
| ----- | ------------------------------------------- | --------------------------------------------------------- |
| 1     | Queue longer than planned, lanes fully busy | Send queue walkers, ask guests to open tickets            |
| 2     | Estimated wait over 15 min                  | Open the reserve lane, move helpers from bar or cloakroom |
| 3     | Queue reaches pavement or road              | Stewards to secure it, delay and announce the start       |
| 4     | Crowding, safety risk                       | Stop entry, safety lead decides                           |

Triggers are examples. Align them with your venue and safety plan.

## How to do this with Eventoren

With Eventoren you open extra scan lanes without installing anything. You create **scanner links**, for instance one per device and entrance, and send them to helpers, who open them in their smartphone browser and scan with the camera. If the camera can't read a code, they type it in. A reserve lane is therefore just one more link sent to one more helper. The scanner needs internet for every scan; there is no offline mode, so plan a backup network route.

During entry, **check-in statistics per entrance and ticket type** show how many guests are in and which entrance is falling behind. Rejected scans show the reason, so helpers send exceptions straight to the help desk.

For the separate lanes: the **guest list** supports quotas and 0 to 5 plus-ones per entry with check-in on the list. Walk-up guests buy cashless via the **box-office QR poster** on their own phone at your box-office prices, then join the main lane with a ticket. There is no cash till or card terminal. Questions go to the [contact page](/kontakt); the German version of this guide is [Einlassmanagement](/ratgeber/einlassmanagement-warteschlangen) (in German).

## Frequently asked questions

### How many ticket scanners do I need for 500 guests?

It depends on the peak and your scan rate. If half of them arrive in the last 30 minutes, that's about 8.3 per minute; at 6 scans per lane per minute you need 2 lanes, at 4 you need 3. Add one reserve lane and a separate help desk.

### How long does a ticket scan take?

The read itself takes a moment. What counts is the total time per guest, including finding the ticket, adjusting brightness and any questions. That's why this guide plans with assumptions of 4 to 10 guests per lane per minute and recommends measuring your own rate.

### When should doors open?

For events with a fixed start, 45 to 60 minutes before is a common starting point, and Weezevent suggests half an hour to an hour. Check with the formula whether your lanes can handle the peak in that window, and give guests a reason to arrive early.

### Does a small event need entry planning at all?

Yes, on a smaller scale. With 150 guests, one lane and 4 guests per minute, entry takes about 38 minutes if everyone came evenly, longer at the peak. A second lane and a separate guest list roughly halve that.

### What is the biggest mistake at event entry?

Doing everything at one spot: scanning, selling, guest list, bag search and ID. Then the slowest case sets the pace for everyone. Separate the steps physically and give each its own capacity.

## Sources

- [Weezevent: how to improve check-in and access control](https://weezevent.com/en-gb/blog/check-in-access-control-attendees/)
- [Tickts: how to manage event queues and entry flow](https://tickts.co.uk/blog/how-to-manage-event-queues-entry-flow)
- [Simpleticket: entrance management for events and festivals](https://company.simpleticket.eu/en/entrance-management)
- [Snapticket: entry calculator with scanner benchmarks](https://go.snapticket.de/einlassmanagement)
- [Bauministerkonferenz: German model venue regulation (MVStättV)](https://www.bauministerkonferenz.de/Dokumente/4231724917250.pdf)
