# CheckGrow

CheckGrow is a lean workspace for small teams and agencies: a members board with
per-person tasks, a private My Life page for every member, a sales-lead CRM with kanban
and table views, spreadsheet-style registries, and newsletter and task-reminder emails.

**App**: https://checkgrow.vercel.app (custom domain: https://ai.checkgrow.com)
**Backend**: its own Supabase project (`pylycnelknmkchfweaph`, eu-central-1)

The UI started from the organization workspace of [Kolektiv.io](https://github.com/apoznic/Kolektiv.io).
Everything else from Kolektiv (AI agents, projects, plans, compensation, calendar, Lovable
auth) was removed, and the app now runs against a small schema of its own instead of
the Kolektiv database.

## What's inside

Signing in lands on the organization workspace (`/admin`). Its sidebar:

- **Members** (Workspace): every approved member with their open tasks. Add a task to any
  member from the quick-assign bar or inline on their card. Tasks live in `crm_tasks` and
  show up in that member's My Life under "Assigned to me by the team".
- **My Life**: private task board (To Do / In Progress / Done), links, and meetings, plus
  the tasks teammates assigned to you.
- **Sales Leads**: lead pipeline with three views: kanban board, card list, and a standard
  CRM table (sortable columns, inline stage change, pipeline and weighted totals).
- **Members & Skills**: member directory, roles, join requests, invitations, and skills.
- **Newsletter**: audiences and groups synced with Resend, campaign sending and history,
  and Task Reminders that email each member a digest of their open tasks.
- **Registry**: spreadsheet-style lists with custom columns, CSV export, paste from Excel,
  and an inbound webhook per list.
- **Settings**: organization profile, role permissions, and integrations (Resend key).

## Stack

- Vite + React 18 + TypeScript, Tailwind CSS + shadcn/ui + Framer Motion
- Supabase: Postgres with row-level security, Auth (email + Google), Storage (avatars),
  Edge Functions (Deno)
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

## Backend

`.env` holds the public Supabase URL and publishable key (safe to commit; access is
enforced by row-level security). The schema is a single migration in
`supabase/migrations/20260912000000_checkgrow_schema.sql`.

Edge functions in `supabase/functions`:

| Function | Purpose |
| --- | --- |
| `accept-invitation` | Enrolls an invited user after they sign up |
| `delete-account` | Removes a user's data and auth account |
| `invite-to-kolektiv` | Sends an invitation email (name kept for the client call) |
| `manage-integrations` | Stores encrypted third-party keys (Resend) per organization |
| `resend-newsletter` | Audience sync, contact management, and campaign sending |
| `send-announcement-emails` | Emails an announcement to all members |
| `send-task-reminders` | Emails each member a digest of their open Members-board tasks |
| `registry-webhook` | Public endpoint that appends rows to a registry |

Function secrets to set in the Supabase dashboard (Edge Functions → Secrets):

- `INTEGRATION_MASTER_KEY`: any long random string; encrypts organization API keys at rest.

Each organization adds its own Resend API key under Settings → Integrations.

## Deployment

Vercel builds `main` on every push (`vercel.json` pins the Vite build and SPA rewrites).
In the Supabase project, add the site URL and `/dashboard` redirect URL for each domain
under Authentication → URL Configuration, and enable the Google provider if you want
Google sign-in.
