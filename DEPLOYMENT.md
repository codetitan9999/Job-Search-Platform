# Deployment Runbook

This app is set up to deploy as a single Docker-based web service on Render with a persistent disk.

## Why Render

- The app includes an in-process hourly scheduler, so it needs an always-on service.
- The app stores uploaded resumes, search profiles, and run history on disk.
- The current architecture should run as a single instance.

## Files already prepared

- `Dockerfile`
- `render.yaml`
- `.dockerignore`

## Step 1: Configure git identity

If git is not configured on your machine yet, run:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

## Step 2: Create the first commit

From this project directory:

```bash
git add .
git commit -m "Initial JobHunt deployment setup"
```

## Step 3: Create an empty GitHub repository

Create a new empty repository on GitHub. Do not add a README, `.gitignore`, or license there.

Example repository name:

```text
jobhunt-control-room
```

## Step 4: Connect the local repo to GitHub

Replace `<your-github-username>` with your GitHub username:

```bash
git remote add origin git@github.com:<your-github-username>/jobhunt-control-room.git
git push -u origin main
```

If you prefer HTTPS instead of SSH:

```bash
git remote add origin https://github.com/<your-github-username>/jobhunt-control-room.git
git push -u origin main
```

## Step 5: Deploy on Render

1. Sign in to Render.
2. Choose `New +`.
3. Choose `Blueprint`.
4. Connect the GitHub repository you just pushed.
5. Render should detect `render.yaml`.
6. Review the generated service:
   - Type: `Web Service`
   - Runtime: `Docker`
   - Instances: `1`
   - Persistent disk mount path: `/app/storage`
7. Create the blueprint.

## Step 6: Wait for the first deploy

Render will:

- Build the Docker image from `Dockerfile`
- Start the app
- Mount the persistent disk at `/app/storage`
- Check service health on `/healthz`

## Step 7: Verify the deployment

After deployment completes, open:

```text
https://<your-render-service>.onrender.com/healthz
```

You should see JSON with `"ok": true`.

Then open the main app URL:

```text
https://<your-render-service>.onrender.com/
```

## Current production limitation

The app is deployable now, but live company portal scraping is still scaffolded. Runs will save configuration and execution history, but they will not yet fetch real job listings until real portal connectors are added.

## Recommended next backend step after deploy

Add real connectors for:

- Greenhouse
- Lever
- Workday
- Direct company career sites
