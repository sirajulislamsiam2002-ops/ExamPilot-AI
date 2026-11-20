# Academia Studio — Web workspace

**Created & Developed By Sirajul Islam**

Your Academic World, Powered by AI.

## Run locally

```bash
cd web
cp .env.example .env
npm install
npm run dev
```

Create a production build with `npm run build`.

## Included in this branch

- Responsive Dashboard and six academic workspaces.
- Supabase email sign-up, sign-in and password reset UI (enabled when Supabase env vars are configured).
- PostgreSQL schema for profiles, projects, cloud library, subscriptions and usage events, with row-level security.
- Private document storage bucket and per-user storage policies.
- Authenticated Academia AI Edge Function using a server-side OpenAI key.
- PDF, DOCX and TXT text extraction; private cloud upload when configured.
- PDF, DOCX and PPTX export helpers.
- Stripe subscription Checkout and webhook Edge Function scaffolding.
- Vercel static deployment configuration and GitHub Actions build workflow.

## Required external setup

1. Create a Supabase project and apply `../supabase/migrations/202611200001_academia_studio_saas.sql`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel and local `.env`.
3. Deploy Supabase functions from the repository's `supabase/functions` directory. Set server-side secrets: `OPENAI_API_KEY`, `OPENAI_MODEL`, `SITE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY` for the Stripe webhook only.
4. Configure the Stripe webhook endpoint for subscription created/updated/deleted events. Use test mode before accepting payments.
5. Import the GitHub repository into Vercel, set Root Directory to `web`, configure environment variables, then deploy.

## Important status and security notes

The repository contains integration code, not connected external accounts. Authentication and cloud features activate only after Supabase setup. Live AI requires the Edge Function and OpenAI secret. Billing requires Stripe test/live configuration. No secret key belongs in browser variables or GitHub source.

The Stripe webhook currently syncs subscription lifecycle events; production billing still needs a full review of checkout completion, customer portal/cancellation, failed payments, idempotency and reconciliation. Add rate limiting and enforce usage quotas before public launch. Admin console and production monitoring are not included yet.

The old Expo/Android project is kept separately and is not replaced by this website.
