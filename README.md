# ExamPilot AI
**Created & Developed By Sirajul Islam**

A React Native + Expo + TypeScript MVP for academic productivity.

## MVP screens
- Dashboard with study overview, progress and upcoming exam
- Student Portal
- Teacher Portal
- ExamGenie chat interface
- English / বাংলা language toggle
- Navy, white, purple and light-grey visual system

> ExamGenie is currently a UI demo. Live AI answers require a secure backend and an AI API connection. Do not put API keys in the mobile app.

## Run locally
```bash
npm install
npx expo start
```

## Build an Android APK
The `preview` EAS profile is configured to produce an installable APK.

1. Create an Expo access token at https://expo.dev/settings/access-tokens
2. In GitHub, open Settings → Secrets and variables → Actions → New repository secret.
3. Name the secret `EXPO_TOKEN` and paste the token as its value.
4. Open Actions → **Build Android APK** → Run workflow. Select `exam-pilot-mvp` if prompted.
5. Wait for the EAS build link in the workflow log, then download the APK from the Expo build page.

The workflow links this project to Expo automatically before starting the build.

## Build profiles
- `preview`: Android APK for direct installation/testing
- `production`: Android App Bundle (AAB) for Google Play

This is an MVP starter. No real student accounts, server database, teacher/student authentication, or live AI backend are connected yet.
