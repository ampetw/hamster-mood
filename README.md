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

Build static files with `npm run build` and host the `dist` folder on any static host (Netlify, Vercel, GitHub Pages, etc.). Set the same `VITE_*` variables in the host’s environment at build time.

## Security note

Row level security allows **anyone** to insert and delete posts. That matches a public “wall” demo. For a production app, add auth and tighten policies.

## Assets

Reaction images live in `public/hamsters/`. Replace PNGs there if you want different art; keep filenames or update the `REACTIONS` list in `src/main.js`.
