# Energy Dial Client Portal: Manual-First Architecture

## Recommendation

Use the existing `energydial.net` domain and the DialDash codebase for the client-facing portal. Do not use a URL shortener as the primary client URL. A branded path such as `energydial.net/client/acme` is more credible and does not require another domain.

For the first three clients:

- Google Drive stores source footage, motioned edits, clean selects, thumbnails, and exports.
- The portal stores project metadata, review status, version labels, feedback, approval, and the Flutterwave payment link.
- Synchronization is manual: updating a Drive link or project record in DialDash updates what the client sees.
- One client never receives a link that exposes another client's folder.

## Why Not Supabase Video Storage First

Supabase can easily handle metadata for 15 clients. Video is the constraint: source and export files consume storage and bandwidth quickly. Use Supabase later for authentication, clients, projects, deliverables, comments, approvals, and audit events, while Drive remains the media store.

## Phase 1: Preview And First Client

- One private URL per client.
- Drive folder links entered manually.
- Deliverable status: processing, ready for review, changes requested, approved, delivered.
- Version label and latest upload time.
- Timestamped feedback.
- Explicit approval action.
- Flutterwave payment-link button.
- Mobile layout.
- No fake automatic synchronization.

## Phase 2: Three Paying Clients

- Supabase magic-link authentication.
- Tables for clients, projects, deliverables, versions, comments, approvals, and invoices.
- Server-side authorization on every client and project read.
- Drive links remain external and permissioned.
- Email notification when feedback or a new version is posted.

## Phase 3: Ten Paying Clients

- Google Drive API integration using a dedicated service account or approved OAuth flow.
- Webhook or scheduled metadata refresh.
- Revision SLA timer.
- Reusable posting-kit templates.
- Portfolio permission tracking.
- Client health and renewal-risk view inside DialDash.

## Security Boundaries

- Never expose a Drive folder configured as public-to-everyone unless the client explicitly approves it.
- Store only a Flutterwave payment link, not card data.
- Verify Supabase row-level security before adding real clients.
- Do not put client IDs, private file links, or payment secrets in static source files.
- Keep demo feedback in local storage until a real authenticated backend exists.
