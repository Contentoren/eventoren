# Eventoren Ratgeber image house style

Shared style for every Ratgeber/Guides hero and in-article scene image. `scripts/contentImageGenerate.ts` builds the final prompt as:

```text
<Prompt prefix>

Scene: <body of src/app/content/image-prompts/<imageKey>.md>

<Negative / constraints>
```

Only the text inside the fenced blocks under `## Prompt prefix` and `## Negative / constraints` is sent to the model.

## Generation settings

- Tool: `@adaptive-ds/codex-imagen` 0.3.0 (pinned devDependency, library call `codexImageGenerate`)
- Gateway: `CODEX_IMAGE_BASE_URL` (default `https://codex.leonardomora.de/v1`), key from `CODEX_IMAGE_API_KEY` or `CODEX_LB_API_TOKEN`
- Model: `gpt-image-2`
- Requested size: `2048x1152` (the gateway usually returns about 1672x941, still 16:9)
- Quality: `medium`, output format `png`
- Post-processing (sharp): cover-crop to 16:9 with `position: attention`, resize to 1920x1080, PNG, written to `images/1920x1080_webp/<imageKey>.png` with the alt text sidecar `images/1920x1080_webp/<imageKey>.md`
- Log: `src/app/content/image-prompts/_generated.json` stores model, size, quality, prompt SHA-256 and timestamp per image key
- Run: `bun run content:images` (`--only=<key,...>`, `--limit=N`, `--concurrency=N`, `--force`)

## Prompt prefix

```text
Authentic documentary photograph from a real European event or a real organiser's workspace: believable setting and details, natural unposed people where people appear, true-to-life skin tones with natural texture, realistic faces and hands, slightly imperfect real-world details. Camera, distance, angle and light are dictated solely by the scene description below: realise exactly the lens, framing, viewpoint and lighting it names, and never fall back to golden-hour glow, teal-and-amber grading, confetti or night-crowd energy unless the scene explicitly asks for them. Where the scene names a different look — bright midday sun, soft overcast daylight, cool blue-hour tones, neutral indoor white light, green park daylight, muted monochrome — render that look faithfully. Clean, uncluttered 16:9 landscape composition with the main subject clearly placed, never a flat empty panel.
```

## Negative / constraints

```text
Strict constraints: no text, letters, numbers, words, signage, posters with writing, labels, logos, brand names, trademarks, watermarks or captions anywhere in the image. Paper, tickets, invoices and printed matter are blank or out of focus; phone, tablet, laptop and monitor screens show only soft abstract blurred light, never readable content, user interfaces, icons or QR codes with detail. No stock-photo cheese: no handshakes, no thumbs-up, no posed group grinning at the camera. People are natural and unposed — celebrating, working or relaxing exactly as the scene describes — never stiff or staged; include confetti, dancing or jumping only when the scene explicitly describes them. Anatomically correct, natural hands with five fingers, undistorted realistic faces and eyes, no extra limbs. No illustration, 3D render, cartoon, CGI look, airbrushed or plastic skin, heavy HDR, oversaturated colours, neon overload or lens-flare overload. No borders, frames, split screens or collages; one single photograph.
```

## Variety rules (for authors, not sent to the model)

Golden-hour glow, teal-and-amber grading, confetti and night crowds are ONE look among many — not the default. Every prompt body must state its own combination explicitly:

- DISTANCE: extreme-wide establishing shot, wide shot, medium shot, or detail/macro close-up. Lean wide; close-ups only where the motif needs them.
- PERSPECTIVE: aerial/drone top-down, high balcony/FOH view, stage POV looking out, backstage view, over-the-shoulder, low ground-level looking up, flat-lay top-down, or doorway framing.
- LENS (write into the scene): 16–24mm ultra-wide, 35mm documentary, 50mm natural, 85mm portrait with shallow depth of field, 70–200mm compressed telephoto, 100mm macro, or drone aerial.
- LIGHTING: bright midday sun, soft overcast daylight, blue-hour cool tones, indoor neutral/white light, green park daylight, cool blue stage light, or muted monochrome — vary across neighbouring articles.
- MOTIF: match the article topic. Legal/admin/finance topics get NO concert crowd: office desk, contract, cashless terminal, spreadsheet/laptop, entrance logistics, storage/tech detail.
- PEOPLE: mix crowd-wide (anonymous), single-person portrait, hands-only detail, and no-people architecture/tech shots.

Hub-grid rule: in any 6 consecutive cards, at most 2 warm-amber night-crowd motifs, and no two adjacent cards may share the same distance+lighting combination.
