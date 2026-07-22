# Memorial Slideshow Site

A simple memorial website: a slideshow of photos and videos with a
background music playlist. Photos and videos are pulled automatically from
a Gmail inbox and stored in [Vercel Blob](https://vercel.com/storage/blob),
so new memories show up on the site without you touching any code.

## How it works

```
Gmail inbox --(Apps Script, every 10 min)--> Vercel Blob --(this Next.js app)--> Slideshow
```

- People email photos/videos to your memorial address.
- A Google Apps Script (`gmail-import/Code.gs`), running on a timer inside
  your Gmail account, checks for new mail with attachments, uploads
  supported photos/videos to your Vercel Blob store, and marks the message
  as processed so it's never imported twice.
- This Next.js site reads the current list of files from Vercel Blob on
  every page load and plays them as a slideshow, with your chosen music
  playing in the background.
- You upload your own music files directly (see below) — Apps Script only
  handles photos/videos from the inbox.

## 1. Personalize the page

Edit `lib/site-config.ts`:

```ts
export const siteConfig = {
  name: "In Loving Memory of [Name]",
  dates: "[Month Day, Year] – [Month Day, Year]",
  message: "A short message shown under the name.",
  photoDurationMs: 6000,       // how long each photo is shown
  maxVideoDurationMs: 30000,   // cap on video playback length
};
```

## 2. Create a Vercel Blob store

1. Create a Vercel account if you don't have one, and run `npx vercel` in
   this project once to link it (or push it to GitHub and import it from
   the Vercel dashboard — either works).
2. In the Vercel dashboard, open this project, go to **Storage** →
   **Create Database** → **Blob**.
3. Choose **Public** access (photos/videos need to be viewable without
   auth for the slideshow to load them directly).
4. Connect the store to this project. Vercel will add a
   `BLOB_READ_WRITE_TOKEN` environment variable to the project
   automatically.
5. For local development, copy `.env.local.example` to `.env.local` and
   fill in the same token (found on the Blob store's page in the
   dashboard), or run `npx vercel env pull` to pull it automatically.

## 3. Upload your music

Music isn't pulled from email — upload your chosen tracks directly to the
Blob store under the `music/` prefix. The easiest way is the Vercel CLI:

```bash
npx vercel blob put ./my-music/01-song.mp3 --pathname music/01-song.mp3
npx vercel blob put ./my-music/02-song.mp3 --pathname music/02-song.mp3
```

Name files with a numeric prefix (`01-`, `02-`, ...) to control playback
order — tracks play in alphabetical order by path and loop back to the
first track after the last one finishes. Supported formats: mp3, m4a, wav,
ogg, aac.

## 4. Set up the Gmail importer (Apps Script)

This runs entirely inside Google's infrastructure — no AWS or server of
your own is needed.

1. Go to [script.google.com](https://script.google.com) while logged into
   the Gmail account that receives memorial photos, and create a new
   project.
2. Delete the default `Code.gs` content and paste in the contents of
   [`gmail-import/Code.gs`](./gmail-import/Code.gs) from this repo.
3. In the editor, go to **Project Settings** (gear icon) → **Script
   Properties** → **Add script property**:
   - Property: `BLOB_READ_WRITE_TOKEN`
   - Value: the same token from step 2 above.
4. Back in the editor, select the `setUpMemorialImporter` function from the
   function dropdown at the top and click **Run**. This creates a Gmail
   label called `memorial-imported` and a trigger that runs the importer
   every 10 minutes.
5. The first run will prompt you to authorize the script's access to
   Gmail and to make external requests (to Vercel). Review and accept —
   this authorization is what lets the script read attachments and upload
   them.
6. That's it. New emails with photo/video attachments will be picked up
   within about 10 minutes and appear on the site automatically (the
   Next.js page always fetches the latest list from Blob, no redeploy
   needed).

**Notes:**
- Supported photo types: jpg, jpeg, png, gif, webp, heic, heif.
- Supported video types: mp4, mov, webm, m4v, avi.
- Gmail attachments are limited to 25MB per Gmail's own limits.
- Photos sent from phone mail apps (iPhone Mail, Gmail app) often arrive
  as *inline* images rather than regular attachments. The importer picks
  these up too, filtering out anything smaller than ~15KB (to skip
  embedded signature logos/icons) so only real photos get imported.
- If threads ever get incorrectly marked as processed (for example, while
  debugging), run the `recoverUnlabelAllProcessed` function in the Apps
  Script editor to make them eligible for re-import.
- The importer only processes mail matching `has:attachment
  -label:memorial-imported` in the connected inbox. If that inbox also
  receives unrelated mail with attachments, narrow the `SEARCH_QUERY`
  constant in `Code.gs` (for example, add `from:someone@example.com` or a
  specific subject line) so only intended submissions get imported.
- You can check what the importer has done any time by opening the Apps
  Script project, going to **Executions** in the left sidebar, and viewing
  the logs.

## 5. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> This project requires Node.js 20+. If your system Node is older, you can
> pin a local version with [mise](https://mise.jdx.dev) (already set up
> via `.mise.toml`) — just run commands with `mise exec node@20 -- <cmd>`,
> or `mise install` once and let it pick up the pinned version
> automatically.

## 6. Deploy to Vercel

```bash
npx vercel deploy --prod
```

Or connect the GitHub repo to Vercel for automatic deployments on push.
Make sure the Blob store is connected to the project (step 2) so
`BLOB_READ_WRITE_TOKEN` is available in production.

## Project structure

- `lib/site-config.ts` — name, dates, message, timing.
- `lib/media.ts` — reads photos/videos/music from Vercel Blob.
- `components/Slideshow.tsx` — the slideshow/player UI.
- `app/page.tsx` — the page, always fetches fresh media on each request.
- `gmail-import/Code.gs` — Google Apps Script that imports Gmail
  attachments into Vercel Blob.

