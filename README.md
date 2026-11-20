# Academia Studio
**Created & Developed By Sirajul Islam**

Your Academic World, Powered by AI.

Academia Studio is being developed as a website-first academic productivity SaaS platform. The new web application lives in `web/`; the existing Expo/Android project remains in the repository and is not replaced.

## Website preview

See [web/README.md](web/README.md) for setup and current capabilities.

```bash
cd web
npm install
npm run dev
```

## Planned SaaS capabilities

- Dashboard and six academic workspaces
- Academia AI assistant
- Exam Center
- Assignment Studio
- Presentation Studio
- My Library
- Secure accounts, cloud sync and file workflows
- Subscription plans and administration

## Current implementation status

The web workspace currently provides responsive navigation, interactive workspace screens, local starter-draft generation and browser-local library storage. Live AI, user authentication, cloud database, document processing and billing are not connected yet; these require secure server-side services and deployment configuration.

The Expo/Android application remains available as a separate project surface. Do not put private AI or payment keys in client-side code.
