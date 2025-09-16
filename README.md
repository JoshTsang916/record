# Idea Vault

Minimal, production-ready Next.js 14 (App Router) app to capture voice ideas, optionally transcribe to text, and store both Markdown and audio files in a GitHub repo. No database.

## Features

- Record in browser (MediaRecorder), save audio + Markdown to GitHub
- Optional OpenAI Whisper transcription (if `OPENAI_API_KEY` set)
- Browsable list, search, tag filter, and details/edit view
- Commit via GitHub Git Data API; maintain lightweight index at `ideas/_index/index.json`
- Optional webhook to n8n on create/update

## Setup

1) Create a GitHub repo and get a PAT

- Create a repo, e.g. `yourname/idea-vault`
- Create a minimal-scope token (repo scope)

2) Deploy on Vercel

- Import this project into Vercel
- Set Environment Variables:
  - `GITHUB_REPO` = `yourname/idea-vault`
  - `GITHUB_TOKEN` = your PAT
  - `OPENAI_API_KEY` = optional (for transcription)
  - `N8N_WEBHOOK_URL` = optional
  - `NEXT_PUBLIC_BASE_URL` = your Vercel URL (for absolute audio URLs in webhooks)
  - `SAVE_AUDIO` = `false` (default) to only store text; set `true` to also commit audio
- Deploy

3) Use it

- Open the site, click Record, speak, Stop
- It auto-saves to GitHub and updates the list
- Click a card to edit details and Save

## File Layout

- Markdown: `ideas/YYYY/MM/idea_<timestamp>_<random>.md`
- Audio: `public/audio/YYYY/MM/idea_<sameId>.<ext>` (m4a on iOS, webm otherwise)
- Index: `ideas/_index/index.json`

Frontmatter fields:

```
id, title, created_at, updated_at, status, importance, tags[],
audio { url, duration_sec }, transcript { model, confidence },
summary, relations { links[] }
```

Body contains the transcript or initial text.

## Webhooks

If `N8N_WEBHOOK_URL` is set, the app POSTs JSON on create/update:

```
{ event, id, title, tags, status, importance, audio_url, text_excerpt, created_at }
```

## Safety & Errors

- Mic permission errors and upload failures are surfaced in UI
- Failed uploads are queued in `localStorage`; a Retry button resubmits
- Server commits via GitHub Git Data API; simple backoff is used client-side

## Development

- `npm i`
- `npm run dev`

## Local Dev without GitHub

You can test end-to-end without GitHub:

- Do nothing special; when `GITHUB_REPO`/`GITHUB_TOKEN` are missing, API routes fall back to an in-memory store.
- Data persists only while the dev server runs. This is for quick UI testing.

## Notes

- Default mode stores only text (no audio). Set `SAVE_AUDIO=true` if you want to commit audio as well.
- If saving audio: iOS Safari records as `audio/mp4` (`.m4a`), Chrome defaults to `webm`. No server-side transcoding.
- All secrets remain server-side in Next.js route handlers.

## Changelog

- See `docs/CHANGELOG.md` for an iterative record of features, fixes, and performance updates.
