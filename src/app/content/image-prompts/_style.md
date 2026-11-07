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
Vibrant, joyful, high-energy event photograph taken at a real European event: laughing and celebrating guests, dancing, applause or hands in the air, confetti drifting in the air where it fits the moment, golden-hour festival glow or colourful stage light with bokeh string lights, dynamic composition with a sense of movement, rich but tasteful colour. Authentic diverse everyday people of different ages, natural smiles, laughter and genuine engagement welcome, no celebrity likeness. Shot on a full-frame camera with a 35mm lens at f/2, shallow depth of field, subject in sharp focus, true-to-life skin tones with natural skin texture, realistic faces and hands, slightly imperfect real-world details. Deep teal (#0f766e) and warm amber (#f59e0b) woven naturally into the scene, for example teal stage light, jackets, lanyards or tablecloths and amber string lights, lamps or evening glow. Believable European setting and details, from festival grounds, concert halls and club rooms to school halls, village squares and historic old towns, modern and full of life. Clean, uncluttered 16:9 landscape composition with the main subject clearly placed, never a flat empty panel.
```

## Negative / constraints

```text
Strict constraints: no text, letters, numbers, words, signage, posters with writing, labels, logos, brand names, trademarks, watermarks or captions anywhere in the image. Phone, tablet, laptop and monitor screens show only soft abstract blurred light, never readable content, user interfaces, icons or QR codes with detail. Tickets, paper and printed items are blank or out of focus. No stock-photo cheese: no handshakes, no thumbs-up, no posed group grinning at the camera. People may smile, laugh, dance and celebrate naturally, never stiff or staged; confetti, dancing and jumping are welcome where they fit the scene. Anatomically correct, natural hands with five fingers, undistorted realistic faces and eyes, no extra limbs. No illustration, 3D render, cartoon, CGI look, airbrushed or plastic skin, heavy HDR, oversaturated colours, neon overload or lens-flare overload. No borders, frames, split screens or collages; one single photograph.
```
