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
- **CRM**: lead pipeline with three views (standard table, kanban board, card list) and an
  **Inbound leads** panel where you create webhooks. Each webhook is a URL; anything POSTed
  to it becomes a contact + lead in the pipeline, tagged with its source.
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
| `crm-lead-webhook` | Public endpoint that turns a POSTed lead into a CRM contact + deal and enrols it in matching automations |
| `crm-automation-runner` | Executes due automation steps; woken by the database scheduler every 5 minutes, by the webhook, or from the app |
| `crm-outbound-dispatcher` | Sends queued outbound webhook deliveries with signatures and retries; woken by a database trigger, the scheduler every 5 minutes, or from the app |

Function secrets to set in the Supabase dashboard (Edge Functions → Secrets):

- `INTEGRATION_MASTER_KEY`: any long random string; encrypts organization API keys at rest.

Each organization adds its own Resend API key under Settings → Integrations.

## Leads view

CRM → Leads is the default view: one dense table of every lead with contact details, source,
campaign, form, ad, stage, owner, value and received date. Filter by any of those (multi-select
with counts), by date range, by "has email" / "has phone", or by free-text search; sort by any
column; hide or show columns; select rows for bulk stage / owner changes, export (CSV) or delete.
Clicking a source or campaign in the table filters by it; clicking a name opens the lead. The view
(filters, columns, sort) is remembered per organization in the browser. Attribution comes from
`crm_deals.campaign / form_name / ad_name / attributes`, which the inbound webhook fills from the
payload (`campaign`, `form`, `ad` and every other field).

## Inbound lead webhooks

Create a webhook in CRM → Inbound leads. It gets a URL like

```
https://pylycnelknmkchfweaph.supabase.co/functions/v1/crm-lead-webhook?token=<token>
```

POST JSON or a form submission to it:

```sh
curl -X POST "<webhook url>" -H "Content-Type: application/json" \
  -d '{"name":"Ana Horvat","email":"ana@example.com","company":"Example d.o.o.",
       "subject":"Website redesign","message":"Need a new site by Q1","value":8500,
       "external_id":"form-1234"}'
```

Recognised fields (case-insensitive): `name` or `first_name`/`last_name`, `email`, `phone`,
`company`, `position`, `subject`/`title`, `message`/`notes`, `value`/`budget`,
`source`/`utm_source`, `external_id` (de-duplication). Wrapped payloads (`data`, `fields`,
`answers`, `form_response`) are unwrapped. Contacts are matched by email within the
organization; the webhook's default owner is notified in-app. The token can also be sent as an
`x-webhook-token` header or as the last path segment.

## Outbound webhooks

CRM → Outbound webhooks. Add a destination URL, pick the events (lead created / updated /
stage changed / won / lost), choose the payload shape and optionally add headers. A database
trigger queues a delivery for every matching change and wakes the `crm-outbound-dispatcher`
function; failed deliveries retry after 1, 5, 15, 60, 360 and 1440 minutes. Each request carries
`x-webhook-id`, `x-webhook-timestamp`, `x-webhook-signature` (`v1,<base64 HMAC-SHA256 of
id.timestamp.body>`), `x-signature` (`sha256=<hex HMAC of the body>`) and `x-webhook-event`.
"Send test" posts a sample lead; "Retry" re-sends a failed delivery. By default a destination
skips leads that arrived through an inbound webhook, so two connected systems never echo each
other. Payload shapes:

```json
{ "event": "lead.created", "sent_at": "…", "delivery_id": "…",
  "lead": { "id", "title", "description", "stage", "previous_stage", "value", "currency", "probability",
            "source", "created_at", "updated_at", "closed_at",
            "assigned_to": { "id", "name" }, "contact": { "id", "name", "email", "phone", "company", "position" } } }
```

Flat (for form-style receivers): `{ event, delivery_id, external_id, name, email, phone, company,
position, subject, message, value, currency, status, pipeline_stage, previous_status,
previous_pipeline_stage, source, assigned_to }`. `status` uses the common new / contacted / qualified /
won / lost vocabulary (Checkgrow validates it); `pipeline_stage` carries the raw CRM stage.

### Importing existing leads (CSV)

Outbound webhooks only fire for leads created after the destination was added. For leads that
already exist in the other tool, export them as CSV there (Checkgrow: Leads → **Export view**) and
click **Import CSV** on the matching webhook card. Each row is posted through the same webhook
pipeline, so it gets the same field mapping, contact matching by email and de-duplication (an
`id`/`external_id` column is used when present, otherwise email + received date). Automations are
skipped for imported rows unless you tick "Run automations for these leads".

### Verifying signed deliveries

If the sending system gives you a signing secret (for example `lwhsec_…` from an outbound
webhook destination), paste it on the webhook card under **Signature verification**. From then
on every delivery must be signed with HMAC-SHA256 over the raw request body using that secret.
The digest can arrive as hex or base64 in `x-signature`, `x-webhook-signature`,
`x-hub-signature-256`, `x-signature-256`, `x-checkgrow-signature` or `signature`, optionally
prefixed with `sha256=`; Stripe-style `t=<ts>,v1=<hex>` (signing `<ts>.<body>`) and Standard
Webhooks `v1,<base64>` with `webhook-id` and `webhook-timestamp` (signing `<id>.<ts>.<body>`)
are accepted too, as is the secret itself in `x-webhook-secret` or an `Authorization: Bearer`
header. Unsigned or mis-signed requests get a 401 and show up as **rejected** in the webhook's
recent deliveries, with the reason.

## Automations (contact loops)

Automations → New automation. Pick the trigger: any inbound source or one specific webhook
(a Meta lead form, a website form, a custom form), optionally filtered on a submitted field
(for example `form_name equals "Pricing"`). Then add steps, each with a delay counted from the
previous step:

- **Send email** to the lead through the organization's Resend key (`{{first_name}}`,
  `{{company}}`, `{{payload.any_field}}` and friends are replaced)
- **Create task** for a member (or the lead owner) with a due date and priority
- **Assign owner**, **Move stage**, **Notify member**, **Wait**

Every enrolled lead is a "loop" with a live log. Zero-delay steps run immediately when the
lead arrives; delayed steps are picked up by a `pg_cron` job that calls the runner every
5 minutes (the shared secret lives in `automation_runner_config`, readable only by the
scheduler and the service role). Owners and admins can cancel a loop or run its next step now.

## Design system

Tokens live in `src/index.css` (HSL variables) and `tailwind.config.ts`. Warm off-white canvas
(#F7F7F5), white cards with a soft shadow, periwinkle accent (#9BA6FF) for active states and
highlights, dark primary buttons (#2A2722), Geist as the only typeface, 4/8/16px radii, no
gradients. Tailwind's stock colour families are remapped onto the brand palette so utilities
like `green-500` or `amber-100` render in brand colours.

## Deployment

Vercel builds `main` on every push (`vercel.json` pins the Vite build and SPA rewrites).
In the Supabase project, add the site URL and `/dashboard` redirect URL for each domain
under Authentication → URL Configuration, and enable the Google provider if you want
Google sign-in.
