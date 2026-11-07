# Eventoren Ratgeber hero image house style

Shared style for every Ratgeber/Guides hero image. `scripts/contentImageGenerate.ts` builds the final prompt as:

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
Editorial documentary photograph for a European event-organising guide. A real, unstaged moment of people organising or running an event in Europe: volunteers, organisers, helpers at the door and box office, school halls, club houses (Vereinsheim), small venues, festivals and planning sessions in ordinary offices or kitchens. Authentic, diverse everyday people of different ages, candid and absorbed in their task, not looking at the camera, natural expressions, no celebrity likeness. Shot on a full-frame camera with a 35mm lens at f/2, shallow depth of field, subject in sharp focus, soft natural film-like colour and visible fine grain, true-to-life skin tones with natural skin texture, slightly imperfect real-world details. Warm natural or practical light, with subtle accents of deep teal (#0f766e) and warm amber (#f59e0b) appearing naturally in the scene, for example a teal lanyard, jacket, wall or tablecloth and amber string lights, lamps or evening glow. Clean, uncluttered 16:9 landscape composition with the main subject placed on the left or right third and calm, softly lit negative space on the other side (blurred room depth, wall or sky with gentle light falloff, never a flat empty panel). Believable European setting and details, understated and modern, quietly optimistic mood.
```

## Negative / constraints

```text
Strict constraints: no text, letters, numbers, words, signage, posters with writing, labels, logos, brand names, trademarks, watermarks or captions anywhere in the image. Phone, tablet, laptop and monitor screens show only soft abstract blurred light, never readable content, user interfaces, icons or QR codes with detail. Tickets, paper and printed items are blank or out of focus. No stock-photo clichés: no handshakes, no thumbs-up, no posed smiling at the camera, no people jumping, no confetti explosions. Anatomically correct, natural hands with five fingers, undistorted realistic faces and eyes, no extra limbs. No illustration, 3D render, cartoon, CGI look, airbrushed or plastic skin, heavy HDR, oversaturated colours, neon overload or lens-flare overload. No borders, frames, split screens or collages; one single photograph.
```
