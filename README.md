# CheckGrow

CheckGrow is an AI-powered team formation and project OS: a supply-side AI agent maps
people's skills and availability, a demand-side AI agent assembles project teams from that
talent pool, and shared CRM and project workspaces track delivery end to end.

**App URL**: https://ai.checkgrow.com

This codebase started as a copy of [Kolektiv.io](https://github.com/apoznic/Kolektiv.io)
and is now developed independently in this repository. It keeps the organization workspace
from Kolektiv and drops the AI-agent onboarding, demo, pitch, and plan pages. Database
tables, edge-function names, and a few route paths (for example `/join-kolektiv` and the
`invite-to-kolektiv` function) keep their original identifiers so the app keeps working
against the existing Supabase schema.

## What's inside

Signing in lands on the organization workspace (`/admin`). Its sidebar:

- **Members** (Workspace): every approved member with their open tasks. Add a task to any
  member from the quick-assign bar or inline on their card; tasks are stored in `crm_tasks`
  and show up in that member's My Life under "Assigned to me by the team".
- **My Life**: private task board (To Do / In Progress / Done), links, and meetings, plus the
  tasks assigned to you by teammates and from legacy project boards.
- **Sales Leads**: lead pipeline with three views: kanban board, card list, and a standard
  CRM table (sortable columns, inline stage change, pipeline and weighted totals). The
  chosen view is remembered per browser.
- **Members & Skills**: member directory, roles, join requests, invitations, and skills.
- **Newsletter**: audiences and groups synced with Resend, campaign sending and history,
  and Task Reminders that email each member a digest of their open tasks.
- **Registry**: spreadsheet-style lists with custom columns, CSV export, paste from Excel,
  and webhooks.
- **Resources**, **Contacts**, **LinkedIn Lead Generator**, and **Settings** (general,
  role permissions, integrations).

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS + shadcn/ui + Framer Motion
- Supabase (Postgres, Auth, Storage, Edge Functions in `supabase/functions`)
- Vitest + Testing Library

## Development

You need Node.js 22+ and [Bun](https://bun.sh) (the `predev`/`prebuild` hooks use `bunx`).

```sh
git clone https://github.com/apoznic/checkgrow
cd checkgrow
bun install
bun run dev
```

Other scripts:

```sh
bun run lint     # eslint
bun run test     # vitest
bun run build    # production build (also regenerates public/sitemap.xml)
```

## Backend configuration

`.env` holds the public Supabase project id, URL, and publishable (anon) key. It currently
points at the same Supabase project as Kolektiv.io, which means the two apps share users
and data. To give CheckGrow its own backend:

1. Create a new Supabase project.
2. Apply the migrations in `supabase/migrations` and deploy the functions in
   `supabase/functions` to it.
3. Update `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`, and
   `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env`, and `project_id` in `supabase/config.toml`.
4. Copy the `public-assets` storage bucket (newsletter logo) or update `LOGO_URL` in
   `src/components/organization/newsletterTemplates.ts` and
   `supabase/functions/_shared/newsletter-templates.ts`.

Edge functions also read their secrets (Resend, Stripe, Firecrawl, Google Calendar, and the
AI gateway) from the Supabase project's function secrets.
