# Event image uploads

Event administrators can upload event images or enter an external image URL. Uploads are authorized server-side and processed through a trusted backend action; service credentials and storage registration are not exposed to the browser. The catalog retains `imageUrl` for compatibility and can additionally store detail, card and organizer variants. Event detail, catalog cards and organizer listings select the corresponding variant, falling back to `imageUrl`. Editing the URL directly clears uploaded variant references.

The upload service configuration and private runtime requirements are documented in `event_image_backend.md`.
