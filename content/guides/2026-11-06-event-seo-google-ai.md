---
title: "Event SEO: Get Your Event Found on Google and AI Assistants"
seoTitle: "Event SEO: Google Events and AI Assistants (2026)"
description: "Event SEO in 2026: Google event structured data, eventStatus for cancellations, Business Profile posts and what ChatGPT, Perplexity and Gemini really document."
publishedAt: "2026-11-06"
slug: "event-seo-google-ai"
author: "Eventoren Editorial Team"
image: "ratgeber-event-sichtbar-google-ki"
imageAlt: "An organiser works on a laptop in a small club office after hours, updating an event page, with a stack of rolled posters on the desk beside him"
category: "planning-marketing"
keywords:
  [
    "event seo",
    "google events",
    "structured data event",
    "event schema markup",
    "eventstatus cancelled",
    "event in chatgpt search",
    "google business profile event",
    "ai search events",
  ]
translationKey: "event-seo-ai"
---

To get your event found on Google, you need one public page per event with all the facts in visible text and `Event` structured data. Google requires three properties: the event name, the start date and the location with a full address. If you sell through a ticketing platform that already outputs this markup, there is nothing technical left to do. For AI assistants such as ChatGPT search, Perplexity, Gemini and Google's AI Overviews, the providers' own documentation points to the same basics: crawlable pages, clear text and consistent facts. Google says explicitly that no special AI files or markup are needed. This guide separates what is documented from what is speculation, as of November 2026.

> **Key takeaways**
>
> - Google shows events in a dedicated event experience in Search and Maps. According to its documentation it is available in the UK, Spain and Germany, among other regions.
> - Required markup: `name`, `startDate` and `location` with address. Recommended: `description`, `endDate`, `eventStatus`, `image`, `offers`, `organizer`, `performer`.
> - When an event is cancelled or postponed, change `eventStatus` but never remove the original date or location.
> - For AI Overviews and AI Mode, Google lists no additional requirements: the page must be indexed and eligible for a snippet.
> - ChatGPT and Perplexity document separate search crawlers (`OAI-SearchBot`, `PerplexityBot`). Blocking them keeps you out of their search answers.

## How do events appear in Google Search?

Google runs a dedicated **event experience**: an interactive list of upcoming events with date, venue, image and a link to tickets, shown in Search and other Google products such as Maps. Google's event documentation (last updated 8 September 2026) lists the regions where it runs: Australia, Brazil, Canada, Germany, India, Latin America, Spain, the United Kingdom and the United States. France, the Netherlands, Italy, Poland and other EU countries are not on that list as of November 2026, but your event pages can still rank as normal results and appear in AI features there.

There are three ways into the event experience:

1. **Through a platform.** Publish on a ticketing or event platform that outputs event structured data.
2. **Through a CMS plugin.** On WordPress and similar systems, a plugin can add the markup.
3. **In your own HTML.** Add the structured data yourself, usually as JSON-LD.

Google states that it "does not guarantee" that structured data will show up in results. Good markup raises your chances; it does not force a result.

### Which events does Google exclude?

| Case                                                                                  | Eligible for the event experience? | What it means for you                   |
| ------------------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------- |
| Public concert, party or festival with tickets for anyone                             | yes                                | the standard case                       |
| Event that requires membership or an invitation before buying                         | no                                 | members-only events won't appear there  |
| Spectator event where participants and audience are mainly minors, on school premises | no                                 | school plays and concerts don't qualify |
| Virtual-only event without a physical location                                        | no                                 | livestreams need other channels         |
| Short-term sale ("tickets 50 % off until Saturday")                                   | no                                 | promotions are not events               |
| Opening hours, coupons, travel packages                                               | no                                 | don't mark them up as events            |

An event with a code-only presale followed by a public sale is a normal public event. How to set that up is in [presale codes](/en/guides/presale-codes).

## What is event structured data?

**Structured data** is a standardised, machine-readable summary of a page. For events you use the `Event` type from the schema.org vocabulary. It tells search engines unambiguously what the event is called, when it starts, where it takes place and what tickets cost, instead of leaving them to guess from the text.

### Required and recommended properties (Google)

| Property            | Status                       | What goes in                                                                                             | Common mistake                                       |
| ------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `name`              | required                     | full event title, e.g. "Summer Night Jazz in the Park 2027"                                              | venue name, price or just "Concert" as the name      |
| `startDate`         | required                     | date and time in ISO 8601 with UTC offset, e.g. `2027-06-12T19:00+02:00`                                 | time without offset, wrong summer time               |
| `location`          | required                     | `Place` with `name` (venue) and `address` (full street address)                                          | city only, or the event title in the venue field     |
| `description`       | recommended                  | the specific event, not your website                                                                     | repeating date and venue instead of using the fields |
| `endDate`           | recommended                  | same format as `startDate`                                                                               | missing on multi-day events                          |
| `eventStatus`       | recommended                  | scheduled, cancelled, postponed, rescheduled                                                             | not updated after a cancellation                     |
| `image`             | recommended                  | crawlable image URL; Google recommends 1920 px wide, minimum 720 px, ideally 16:9, 4:3 and 1:1 versions  | text-heavy flyer, image blocked from crawling        |
| `offers`            | recommended                  | one `Offer` per ticket type with `price`, `priceCurrency`, `availability`, `url`, optionally `validFrom` | price without fees, `InStock` when sold out          |
| `organizer`         | recommended                  | name and URL of the host                                                                                 | missing                                              |
| `performer`         | recommended                  | one `Person` or `PerformingGroup` per act                                                                | acts in the event name instead                       |
| `previousStartDate` | recommended when rescheduled | the old start date, only with `EventRescheduled`                                                         | combined with another status                         |

Two details people miss: `offers.price` should be **the lowest available price including service charges and fees**, and `0` for free events. That matches EU rules on showing total prices, see [how to price event tickets](/en/guides/how-to-price-event-tickets). And `offers.url` must lead to a page where any member of the public can buy a ticket for that specific event.

### Technical rules

- **One URL per event.** Google supports pages that focus on a single event, so mark up event pages, not schedule pages listing many dates.
- **Multi-day events.** A three-day festival gets both start and end date. If each day has its own tickets, give each performance its own `Event`.
- **Time zones.** Add the UTC offset. For Central European Time that is +01:00 in winter and +02:00 in summer; for the UK and Ireland +00:00 and +01:00. Without an offset, Google uses the venue's time zone.
- **Test.** Validate with the Rich Results Test, check fetchability with the URL Inspection tool in Search Console, and list event pages in your sitemap.

### Example: minimal event markup in JSON-LD

A fictional example. Replace every value with your own.

```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Summer Night Jazz in the Park 2027",
  "startDate": "2027-06-12T19:00+02:00",
  "endDate": "2027-06-12T23:00+02:00",
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "location": {
    "@type": "Place",
    "name": "Park Pavilion",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Parkweg 1",
      "postalCode": "1012 AB",
      "addressLocality": "Amsterdam",
      "addressCountry": "NL"
    }
  },
  "image": ["https://example.org/img/jazz-16x9.jpg"],
  "description": "Open-air evening with three local jazz trios, food trucks and a family area until 21:00.",
  "offers": {
    "@type": "Offer",
    "url": "https://example.org/tickets/jazz-2027",
    "price": "18.00",
    "priceCurrency": "EUR",
    "availability": "https://schema.org/InStock"
  },
  "organizer": { "@type": "Organization", "name": "Example Jazz Society", "url": "https://example.org" },
  "performer": { "@type": "PerformingGroup", "name": "The Example Trio" }
}
```

## What should you do when an event is cancelled or postponed?

This is where most mistakes happen: the event is cancelled, the page is deleted or the date removed, and Google keeps showing the old listing. Google's documentation is unambiguous:

| Situation                   | `eventStatus`                              | `startDate`                                           | Also do                                                     |
| --------------------------- | ------------------------------------------ | ----------------------------------------------------- | ----------------------------------------------------------- |
| Going ahead                 | `EventScheduled` (default, may be omitted) | the date                                              | –                                                           |
| Cancelled                   | `EventCancelled`                           | **keep the original date**                            | keep location and all other values; leave the page online   |
| Postponed, new date unknown | `EventPostponed`                           | **keep the original date** until the new one is known | say "new date to follow" on the page                        |
| New date confirmed          | `EventRescheduled`                         | **the new date**                                      | add `previousStartDate` with the old date; update `endDate` |

Keep a cancelled event's page online: it is where buyers look for refund information. What you owe buyers is covered in [event cancelled? Refund rights in the EU](/en/guides/event-cancellation-refunds-eu).

## Should the event page live on a ticketing platform or your own site?

Both work, and many organisers use both. What matters is that the facts match.

| Criterion         | Ticketing platform event page       | Your own website                        |
| ----------------- | ----------------------------------- | --------------------------------------- |
| Structured data   | often built in; check your provider | you add it yourself or via a plugin     |
| Effort            | low: fill in the fields             | higher: tech and maintenance            |
| Buy button        | on the page                         | link or embedded shop                   |
| Brand and archive | limited                             | full: history, photos, press, sponsors  |
| Domain strength   | depends on the platform             | grows with every event on your domain   |
| Recurring series  | one page per date                   | an overview page plus one page per date |

Our assessment, not a Google rule: for a one-off event, a platform page with structured data is enough. For a regular series, add your own site with an overview and links to each ticket page. If you mark up the event on your site too, point `offers.url` at the ticket page and keep every value identical. Two pages with different start times are worse than one page.

### What belongs in the page text?

Markup must match visible content, so write the page for people first:

- What it is and who it's for, in the first two or three sentences
- Date, doors, start and end times, venue with address
- Every ticket type with its total price and age limit
- Programme or line-up, accessibility and organiser contact

## How does Google Business Profile help?

If your organisation has a fixed public venue, such as a clubhouse, bar, theatre or hall, a **Google Business Profile** adds visibility in Search and Maps. According to Google's help centre you can publish **Event posts** with a title, start and end dates and times, a description, photo or video and an action button, for example linking to tickets.

- Create one event post per event and link the ticket page.
- Posts older than six months are archived unless a date range is set.
- Posts with a phone number in the text may be rejected if the number can't be verified as belonging to the business.
- Keep opening hours, address and website current. Google's guidance on AI features specifically recommends keeping Business Profile information up to date.

If you use changing venues, ask the venue operator to post your event on their profile.

## How do events show up in ChatGPT, Perplexity, Gemini and AI Overviews?

Whether your event appears when someone asks "what's on in Dublin this weekend?" is decided by the providers, who disclose only part of how their systems work.

### What the providers document

| Provider                               | What the documentation says (as of November 2026)                                                                                                                                                                                                                 | What you can do                                                                      |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Google AI Overviews and AI Mode        | No additional requirements. To be shown as a supporting link, a page must be indexed and eligible to appear in Search with a snippet. No new machine-readable files, AI text files or special schema.org markup needed. Structured data should match visible text | normal SEO basics: crawlable, linked, text not just images, Business Profile current |
| Google Gemini (training and grounding) | The `Google-Extended` robots.txt token controls use for Gemini training and grounding. It does not affect inclusion in Google Search and is not a ranking signal                                                                                                  | decide deliberately; don't block it by accident                                      |
| OpenAI ChatGPT search                  | `OAI-SearchBot` surfaces sites in ChatGPT search. Sites opted out "will not be shown in ChatGPT search answers". `GPTBot` is separate and concerns model training. `ChatGPT-User` fetches pages on user request                                                   | allow `OAI-SearchBot` in robots.txt                                                  |
| Perplexity                             | `PerplexityBot` surfaces and links websites in Perplexity search results and is not used to crawl content for AI foundation models. `Perplexity-User` fetches pages on user request                                                                               | allow `PerplexityBot`; check firewall rules                                          |
| Anthropic Claude                       | `Claude-SearchBot` improves search results, `Claude-User` fetches pages on user request, `ClaudeBot` collects training data                                                                                                                                       | allow the search and user agents if you want to be cited                             |

A frequent cause of invisibility isn't robots.txt but bot protection at your host or CDN. Google lists blocking by "any CDN or hosting infrastructure" as something to check, and Perplexity documents firewall allow rules for its bots.

### What is plausible but unproven

The following is our assessment. No provider has confirmed it as a ranking factor:

- **Mentions elsewhere.** Assistants with web search cite sources visibly. The more reputable pages (city listings, local press, the artist's site) carry the same facts about your event, the more likely one of them is cited.
- **Consistency.** Conflicting times or prices across pages may lead an assistant to give wrong or vague answers.
- **Quotable sentences.** "Summer Night Jazz takes place on 12 June 2027 from 19:00 at the Park Pavilion, Amsterdam" is easy to quote. "This summer will be legendary!" is not.
- **Freshness.** A page updated immediately after any change is the most reliable source for every system.

Not documented, and explicitly denied by Google for its own AI features: that you need special AI files, chatbot keywords or extra markup. Anyone selling guaranteed placement in ChatGPT is selling something nobody can guarantee.

## Checklist: an event page that gets found

**Content**

- [ ] Its own URL for this event, public without login
- [ ] Event name without prices, promotions or capitals shouting
- [ ] Date, doors, start and end in visible text
- [ ] Venue name and full address in text
- [ ] Description with programme, audience and age limit in the first sentences
- [ ] Every ticket type with total price including fees
- [ ] Landscape image at least 1920 px wide, little text

**Technical**

- [ ] `Event` markup with `name`, `startDate`, `location` and address
- [ ] Recommended fields: `endDate`, `description`, `image`, `offers`, `organizer`, `performer`, `eventStatus`
- [ ] Correct UTC offset (summer time)
- [ ] Rich Results Test without critical errors
- [ ] Not blocked by robots.txt, noindex or firewall, including for `OAI-SearchBot` and `PerplexityBot`
- [ ] Listed in the sitemap and linked from your home or overview page

**Distribution and upkeep**

- [ ] Same facts in event calendars, social media, press release and Business Profile
- [ ] Artists, venue and partners link to the event page
- [ ] `availability` set to `SoldOut` when sold out; `eventStatus` updated on cancellation, page kept online
- [ ] After the event: keep the page with a recap and a link to the next date

## How to do this with Eventoren

Every published event on Eventoren gets its own public event page at `/events/<id>`. These pages carry schema.org `Event` structured data, including name, dates, venue, organiser, ticket offer and the event image if you upload one. You don't write any code. Fill in title, description, venue, full address and image completely, because the markup can only be as good as your data.

On the event page, buyers check out as guests without an account and receive their ticket by email as a PDF with a QR code. If you run your own website, link from there to the Eventoren event page. Developers can also use API keys and an HTTP API to pull event data into their own site.

Before sales start, Eventoren checks and approves your organisation, so allow time for short-notice events. Keep in mind that the Eventoren interface is in German and sells in EUR only. Questions go through our [contact form](/kontakt). The German version of this guide is [Event bei Google und KI-Assistenten sichtbar machen](/ratgeber/event-sichtbar-google-ki) (in German).

## Frequently asked questions

### How do I add my event to Google?

There is no submission form. Google finds events through pages with `Event` structured data. Publish on a platform that outputs this markup, or add it to your own event page and test it with the Rich Results Test. Google does not guarantee that an event appears in the event experience.

### What information does Google need for an event?

Required are the event name, the start date and time in ISO 8601 format, and the location with venue name and full address. Recommended are end date, description, image, ticket offer with price, organiser, performers and event status.

### What do I do on Google when my event is cancelled?

Set `eventStatus` to `EventCancelled` and leave the date, location and all other values unchanged. Don't delete the page; use it to explain how buyers get their money back. For a postponement use `EventPostponed`, then `EventRescheduled` with `previousStartDate` once the new date is fixed.

### How does my event get into ChatGPT or Perplexity?

There are no guarantees. What is documented: `OAI-SearchBot` and `PerplexityBot` must be able to fetch your page, otherwise it won't appear in their search answers. Beyond that, clear quotable sentences, consistent facts everywhere and mentions on other reputable sites are likely to help, though no provider confirms this.

### Do I need an llms.txt file or special AI markup?

Not for Google's AI Overviews and AI Mode: Google says no new machine-readable files, AI text files or special markup are needed. Other providers have made no binding statements either way. Focus on a complete, crawlable event page with structured data.

## Sources

- [Google Search Central: Event structured data (last updated 8 September 2026)](https://developers.google.com/search/docs/appearance/structured-data/event)
- [Google Search Central: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [Google Search Central: Google's common crawlers (Google-Extended)](https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers)
- [Google Business Profile Help: Create and manage posts](https://support.google.com/business/answer/7342169?hl=en)
- [OpenAI: Overview of OpenAI crawlers](https://platform.openai.com/docs/bots)
- [Perplexity: Perplexity crawlers](https://docs.perplexity.ai/docs/resources/perplexity-crawlers)
- [Anthropic: Does Anthropic crawl data from the web, and how can site owners block the crawler?](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)
- [schema.org: Event](https://schema.org/Event)
