# Hamster Mood — Digital Billboard

A pink-themed **shared billboard**: visitors pick a hamster reaction, write a short message, and everyone sees posts in near real time. Click a post on the board to **keep** it or **delete** it for all users.

## Run locally

1. **Create a Supabase project** (free): [supabase.com](https://supabase.com)

2. **Database**: In the Supabase dashboard, open **SQL Editor**, paste the contents of [`supabase/billboard_posts.sql`](supabase/billboard_posts.sql), and run it. That creates the `billboard_posts` table, open read/write/delete policies for this demo, and registers the table for Realtime.

3. **API keys**: Project **Settings → API**. Copy the project URL and the `anon` `public` key.

4. **Environment**: In this folder, copy `.env.example` to `.env` and set:

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

5. **Install and dev server**:

   ```bash
   npm install
   npm run dev
   ```

   Open the URL Vite prints (usually `http://localhost:5173`).

## Deploy

This project builds into the **`docs/`** folder (`vite.config.js` → `build.outDir`).

**GitHub Pages:** In the repo on GitHub, go to **Settings → Pages**. Under **Build and deployment**, set **Source** to **Deploy from a branch**, choose **`main`**, folder **`/docs`**, then save. The site URL will look like `https://<user>.github.io/hamster-mood/`.

After you change the app, run `npm run build` again and **commit the updated `docs/`** folder so Pages picks up changes.

### Make POST work on GitHub Pages (no secrets needed)

GitHub Pages can’t provide Vite build-time env vars, so the deployed site reads Supabase keys from a file.

1. In your GitHub repo, edit **`docs/runtime-config.json`** and set:
   - `supabaseUrl`
   - `supabaseAnonKey` (the public anon key)

2. Commit the change on GitHub.

The site will then enable **POST** and everyone will see updates.

Local dev can still use `.env` (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`).

**If the site loads but hamsters and clicks do nothing:** GitHub Pages often serves `…/hamster-mood` without a trailing slash; relative asset URLs then break. This repo’s production build uses **`base: /hamster-mood/`** in `vite.config.js` so scripts and images load. If you **rename the GitHub repo**, update the `REPO_NAME` constant there to match.

Other hosts can upload the contents of **`docs/`** (or change `outDir` and `base` if you prefer).

## Security note

Row level security allows **anyone** to insert and delete posts. That matches a public “wall” demo. For a production app, add auth and tighten policies.

## Assets

Reaction images live in `public/hamsters/`. Replace PNGs there if you want different art; keep filenames or update the `REACTIONS` list in `src/main.js`.
