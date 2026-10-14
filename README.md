# NextPosts

A small social feed built with the Next.js App Router. Users can create posts with an image, browse the feed, and like posts. Posts are written through Server Actions, and likes update instantly in the browser before the server confirms them (optimistic updates).

> **Status:** learning project. There is no login yet: every post is saved as user 1 and every like as user 2. Don't expose it to the public internet. See [Known limitations](#known-limitations).

## Features

- Create posts with a title, content and a PNG or JPEG image (up to 5 MB)
- Validation on the server, with errors shown in the form
- Feed and home page with optimistic like and unlike
- Pluggable image storage: local disk by default, Supabase Storage when configured
- Uploaded files are checked by their content bytes, not by file name or browser-reported type

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js 14 (App Router, Server Actions) |
| UI | React 18 |
| Database | SQLite via `better-sqlite3` (file `posts.db`) |
| Image storage | Local disk (`uploads/`) or Supabase Storage |

## Prerequisites

- **Node.js 18.17 or newer.** Tested with Node 22 LTS.
- npm (comes with Node).
- `better-sqlite3` is a native module. Prebuilt binaries cover common platforms. If `npm install` tries to compile it and fails, install the C++ build tools for your OS (on Windows: "Desktop development with C++" from the Visual Studio Build Tools).

## Getting started

```bash
git clone https://github.com/MohammadTarhini98/nextposts.git
cd nextposts
npm install
cp .env.example .env.local
npm run dev
```

Open the URL printed in the terminal (normally http://localhost:3000; Next.js picks the next free port if 3000 is taken).

On first start the app creates `posts.db` with its tables and two demo users. No other setup is needed: images are saved to `uploads/` unless you configure Supabase.

## Configuration

All settings are environment variables in `.env.local`, which is gitignored. See [`.env.example`](.env.example).

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `UPLOAD_DIR` | No | `uploads` | Folder for locally stored images |
| `SUPABASE_URL` | No | — | Supabase project URL. Setting this and the key switches storage to Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | No | — | Supabase service role key. **Secret:** server-side only, never prefix with `NEXT_PUBLIC_` or commit it |
| `SUPABASE_STORAGE_BUCKET` | No | `post-images` | Public Supabase bucket for images |

### Image storage

The backend is chosen automatically in [`lib/storage.js`](lib/storage.js):

- **Local disk (default):** files are written to `uploads/<uuid>.<ext>` and served by [`app/uploads/[filename]/route.js`](app/uploads/[filename]/route.js). They live outside `public/` because Next.js only serves files that exist in `public/` at build time.
- **Supabase Storage:** used when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set to real values. Create a **public** bucket named `post-images` first (Supabase dashboard → Storage → New bucket).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build |
| `npm start` | Serve the production build (`npm start -- -p 3002` to choose a port) |
| `npm run lint` | Run ESLint (not configured yet: the first run asks to set it up) |

**Run only one of `dev` or `build`/`start` at a time in the same folder.** They share the `.next/` directory, and running both can corrupt the build.

## Project structure

```
actions/posts.js          Server Actions: createPost, togglePostLikeStatus
app/
  page.js                 Home: latest 2 posts
  feed/page.js            All posts
  new-post/page.js        Create-post page
  uploads/[filename]/     Serves locally stored images
components/
  postform.js             Create-post form (client, useFormState)
  form-submit.js          Submit button with pending state (useFormStatus)
  posts.js                Post list with optimistic likes (client, useOptimistic)
lib/
  posts.js                SQLite schema and queries
  storage.js              Image validation and storage backends
  format.js               Date formatting
```

## Data and backups

Runtime data is **not** in git:

- `posts.db`: posts, users and likes
- `uploads/`: images (local storage backend)

A post's database row and its image file belong together, so back up **both at the same time**. To take a consistent copy of the database while the app is running:

```bash
node -e "require('better-sqlite3')('posts.db').backup('posts-backup.db').then(() => console.log('done'))"
```

To restore, stop the app and copy the backed-up `posts.db` and `uploads/` back into the project folder.

## Known limitations

- **No authentication.** User IDs are hardcoded, so anyone who can reach the app can post and like.
- **Next.js 14.1.0 has known security advisories**, including some affecting Server Actions. Upgrade to the latest 14.2.x before any real deployment.
- **Timestamps** are stored in UTC without a time-zone marker, so they display offset by the viewer's UTC offset.
- **No length limits** on title and content yet.
- **Image metadata (EXIF) is not stripped.** Photos taken on phones can include GPS location.
- `lib/posts.js` adds an artificial 1-second delay to database calls, to demonstrate loading states.
- If saving a post fails after its image was stored, the image is left behind with no post.

## Roadmap

1. **Cleanup:** fix timestamps, add input length limits, remove unused code.
2. **Security:** upgrade Next.js, strip EXIF data from images, add authentication (e.g. Better Auth) with ownership checks, rate limiting, security headers.
3. **Features:** edit and delete posts, pagination, image preview, profiles.
4. **Operations:** Docker image, reverse proxy with TLS, automated backups, Playwright tests in CI, health checks and logging.
