# Idea Vault — Deployment Status (living document)

Last updated: {{update_here_when_editing}}

Scope
- Current production deployment snapshot so anyone (including the AI assistant) can immediately regain context.

Project
- Repo (app code): https://github.com/JoshTsang916/record (branch: `main`)
- Hosting: Vercel Project “record” (Next.js 14 App Router)

Operating Mode
- Audio: NOT persisted (text‑only). `SAVE_AUDIO=false`
- Storage: GitHub data repository (no DB)
  - `GITHUB_REPO=JoshTsang916/idea-vault-data`
  - Layout: `ideas/YYYY/MM/idea_<timestamp>_<rand>.md`
  - Index: `ideas/_index/index.json`

Secrets & Env (configured on Vercel; do NOT commit secrets)
- `OPENAI_API_KEY` = set (Whisper transcription enabled)
- `SAVE_AUDIO` = `false`
- `GITHUB_REPO` = `JoshTsang916/idea-vault-data`
- `GITHUB_TOKEN` = fine‑grained PAT with “Repository access → Only select repositories → idea-vault-data”; “Repository permissions → Contents: Read and write”
- `N8N_WEBHOOK_URL` = not set (optional)
- `NEXT_PUBLIC_BASE_URL` = not set (optional; set to Vercel URL if you want absolute URLs in webhooks)

Production Notes
- The data repo was initially empty (GitHub returns 409 on ref read). A first manual commit (`README.md`) was added to `idea-vault-data` to unblock committing.
- API routes in use: `/api/capture`, `/api/save`, `/api/list`, `/api/read`.
- Frontend uses MediaRecorder; only transcript is stored.

Validated Flow
1) Home → “Record” → Stop (Transcribe on) → creates Markdown in data repo → list updates.
2) Home → “New (text)” → Save → creates Markdown in data repo → list updates.
3) Details page → edit title/tags/importance/status/text → Save → commits update and index.

Troubleshooting Quick Map
- 500 on `/api/capture` or `/api/save`:
  - 409 “Git Repository is empty” → add an initial commit in data repo or redeploy with latest code (now handled but manual commit is already in place).
  - 401/403/404 “Bad credentials/Not found” → verify `GITHUB_TOKEN` scope and `GITHUB_REPO` spelling; ensure token is fine‑grained with Contents: Read & Write.
  - 422 “Update ref failed” → check branch protection on default branch. Allow direct updates or disable protection during testing.
- Whisper fails → check `OPENAI_API_KEY` present in Vercel env and quota available.

Local Dev Mode
- Without `GITHUB_REPO`/`GITHUB_TOKEN`, APIs fall back to an in‑memory dev store (non‑persistent). Useful for UI iteration.

Open Decisions / Next Features (pick any to implement next)
- A) Toast notifications + Navbar search sync + tag click‑to‑filter
- B) Retry queue UX polish（顯示原因/清空/重試結果提醒）
- C) Detail auto‑save (debounced) + tag chips
- D) Delete idea (`/api/delete`) + confirm dialog
- E) One‑click AI summary → writes `frontmatter.summary`
- F) Kanban view by status (draft/curating/todo/done)

Owner Checklist
- [ ] Keep data repo default branch unprotected (or allow direct push) while iterating.
- [ ] Optional: set `NEXT_PUBLIC_BASE_URL` to Vercel URL if enabling webhooks.
- [ ] Optional: add `N8N_WEBHOOK_URL` for automations.

