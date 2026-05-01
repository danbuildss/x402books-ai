# x402Books AI

Readable books for the agent economy.

x402Books AI turns Base USDC microtransactions into clean reports, spend categories, and agent-readable financial summaries.

## Current Scope (Component 1)
This repository currently includes:
- High-quality landing page (dark fintech SaaS style)
- Waitlist form with fields:
  - email (required)
  - X handle (optional)
  - use-case feedback
  - pain-point feedback
- `POST /api/waitlist` API route
- Supabase waitlist table SQL

## Tech
- Next.js (App Router)
- Tailwind CSS utility classes in JSX
- Supabase (server-side insert using service role key)

## Environment Variables
Create a `.env.local` file:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key
```

## Supabase Setup
Run `supabase/waitlist.sql` in Supabase SQL editor:

```sql
create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  x_handle text,
  use_case text,
  pain_point text,
  source text not null default 'landing_page',
  created_at timestamptz not null default now()
);
```

## Local Run
If this is not yet a full initialized Next.js workspace in your environment, initialize dependencies first, then run:

```bash
npm install
npm run dev
```

## Deploy to Vercel
1. Push this repository to your GitHub.
2. Import the repo in Vercel.
3. Add environment variables in Vercel Project Settings.
4. Deploy.

## GitHub Push Commands
After adding your remote:

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin work
```

If your default branch is `main` and you want to push current branch there:

```bash
git push -u origin HEAD:main
```

## Security Note
If any Supabase keys were shared publicly, rotate them immediately in Supabase Dashboard.
