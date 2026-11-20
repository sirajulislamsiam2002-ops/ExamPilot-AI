# Academia Studio — Web workspace

**Created & Developed By Sirajul Islam**

This is the website-first workspace for Academia Studio. It is intentionally kept in `web/` so the existing Expo/Android app remains untouched.

## Run locally

```bash
cd web
npm install
npm run dev
```

Create a production build with `npm run build`.

## Current preview capabilities

- Responsive desktop and mobile navigation
- Dashboard with six academic workspaces
- Academia AI prompt interface (preview only; no AI provider connected)
- Exam Center, Assignment Studio and Presentation Studio starter templates
- My Library saves drafts to browser localStorage on this device
- No account, cloud database, payment or server-side AI integration yet

## SaaS implementation roadmap

1. Configure a production web deployment and environment management.
2. Add secure authentication and user profiles.
3. Add PostgreSQL-backed projects, library and usage records.
4. Add server-side AI provider integration with rate limits and usage tracking.
5. Add secure document upload, parsing and export workflows.
6. Add subscription plans, payment integration, admin console, audit logs and privacy controls.
7. Add PWA installation and connect the Android app to the shared backend.

Never expose private API keys in browser code.
