# Academia Studio
**Created & Developed By Sirajul Islam**

A React Native + Expo + TypeScript learning workspace backed by Supabase.

## Current app modules
- Email/password account creation and sign-in
- Student Portal: join a classroom using a class code
- Teacher Classroom: create classes and publish assignments (teacher/admin role required)
- Assignment Studio: read published work and submit responses
- Exam Center: view scheduled exams
- Supabase Auth session persistence and row-level database access

## Supabase setup
The mobile app uses the project's public publishable key. It is safe to include in a client application; never add a Supabase service-role or secret key to the app.
For a different environment, set:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The app includes the current Academia Studio project URL and publishable key as public-client defaults. Authentication and database permissions are enforced by Supabase RLS.

## Run locally
```bash
npm install
npx expo start
```

## Android APK
The `preview` EAS profile produces an installable APK. The GitHub Actions workflow requires the repository's `EXPO_TOKEN` secret to start an EAS build.

## Important limitations
- Teacher access is granted by an administrator; a student cannot promote their own account.
- The Exam Center currently lists exams. Timed exam attempts, question answering, grading, file uploads, and teacher gradebook screens are not implemented in this mobile build yet.
- ExamGenie live AI is a separate feature and requires its backend provider secret to be configured.
