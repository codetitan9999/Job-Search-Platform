# JobHunt Control Room

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

This repo is now prepared for container deployment:

- `Dockerfile` builds the app as a single Node container.
- `render.yaml` provisions a single Render web service with a persistent disk.
- `HOST`, `PORT`, and `STORAGE_ROOT` are configurable through environment variables.

Recommended deployment target: Render web service with a persistent disk.

Why this fits the current architecture:

- The app uses an in-process hourly scheduler, so it needs an always-on service.
- Search profiles, run history, and uploaded resumes are stored on disk, so it needs persistent storage.
- The current architecture should run as a single instance because the scheduler and local disk are instance-local.

Render setup:

1. Push this repo to GitHub.
2. In Render, create a Blueprint or Web Service from the repo.
3. Keep `render.yaml` as the source of truth.
4. Make sure the persistent disk is mounted at `/app/storage`.
5. After deploy, the service health check should pass on `/healthz`.

Local Docker run:

```bash
docker build -t jobhunt-control-room .
docker run -p 3000:3000 -e STORAGE_ROOT=/app/storage jobhunt-control-room
```

## Current limitation

The backend infrastructure is now wired, but live job retrieval is still scaffolded. Each run records execution history and produces connector reports that show which companies still need real career-portal adapters.

## Next steps

1. Add real company portal connectors for Greenhouse, Lever, Workday, and direct career sites.
2. Parse resume content and score job descriptions against skills and experience.
3. Persist retrieved jobs separately from run history.
4. Add outbound notifications for email, Slack, or Telegram.
