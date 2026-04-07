# How do you feel — Shared board

A pink-themed **shared wall**: visitors answer *How do you feel right now?* in a text box and tap **POST**. Everyone sees posts on the light-pink panel in near real time. Tap a post to **keep** or **delete** it for all users.

## Run locally

1. **Create a Supabase project** (free): [supabase.com](https://supabase.com)

2. **Database**: In the Supabase dashboard, open **SQL Editor**, paste the contents of [`supabase/billboard_posts.sql`](supabase/billboard_posts.sql), and run it. That creates the `billboard_posts` table (`content` + `created_at`), open read/write/delete policies, and registers the table for Realtime.

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

**GitHub Pages:** **Settings → Pages** → **Deploy from a branch** → **`main`** → folder **`/docs`**.

After you change the app, run `npm run build` and **commit the updated `docs/`** folder.

### POST on GitHub Pages

Edit **`docs/runtime-config.json`** with your **Project URL** and **anon public** key, then commit.

**If scripts don’t load:** the production build uses **`base: /hamster-mood/`** in `vite.config.js`. If you **rename the repo**, update **`REPO_NAME`** there.

## Security note

Row level security allows **anyone** to insert and delete posts. That matches a public demo wall.
