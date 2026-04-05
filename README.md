# JobHunt Control Room

Live Demo: [https://job-search-platform-three.vercel.app/](https://job-search-platform-three.vercel.app/)

Local UI, API, and scheduler for configuring a resume-aware company portal job search.

## What it does

- Collects the resume, target roles, excluded roles, company list, filters, portal access mode, notification methods, and preferred tech stack in the UI.
- Saves the profile and resume metadata to disk.
- Exposes API endpoints for config load/save, status, runs, and run-now.
- Runs a scheduler loop that can trigger the search every hour.
- Shows a live JSON payload preview and recent execution history in the UI.

## Files

- `index.html`: application shell
- `styles.css`: visual design and responsive layout
- `app.js`: form state, backend integration, and run history rendering
- `server.js`: local HTTP server and API routes
- `lib/`: profile normalization, storage, multipart parsing, scheduler, and job-runner scaffold

## Run it

```bash
npm start
```

Then open `http://127.0.0.1:3000`.

## Deploy it

This repo now supports two deployment modes:

### Free manual-run deployment

Use Vercel with:

- `vercel.json`
- `api/` serverless functions
- browser-local draft storage
- manual `Run search` only

This is the best free option if we are temporarily ignoring the hourly scheduler.

### Persistent deployment

Use Render with:

- `Dockerfile`
- `render.yaml`
- persistent disk mounted at `/app/storage`

This is the better fit when we bring back the hourly scheduler and server-side storage.

## Free deployment notes

The Vercel path is intentionally manual-run only:

- no hourly scheduler
- no server-side disk persistence
- search profile drafts and recent runs are kept in the browser

## Local Docker run

```bash
docker build -t jobhunt-control-room .
docker run -p 3000:3000 -e STORAGE_ROOT=/app/storage jobhunt-control-room
```

## Current limitation

The deployment paths are wired, but live job retrieval is still scaffolded. Each run records execution history and produces connector reports that show which companies still need real career-portal adapters.

## Next steps

1. Add real company portal connectors for Greenhouse, Lever, Workday, and direct career sites.
2. Parse resume content and score job descriptions against skills and experience.
3. Persist retrieved jobs separately from run history.
4. Add outbound notifications for email, Slack, or Telegram.
