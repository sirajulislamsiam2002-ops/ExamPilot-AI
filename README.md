# Academia Studio
**Created & Developed By Sirajul Islam**

A React Native + Expo + TypeScript learning workspace backed by Supabase.

## Current app modules
- Email/password account creation and sign-in with persisted sessions
- Student Portal: join a classroom using a class code
- Teacher Classroom: create classrooms and publish assignments (teacher/admin role required)
- Assignment Studio: read published work and submit text responses
- Teacher grading: review student submissions, award marks, and save feedback
- Exam Center: start/resume timed attempts, answer MCQ and true/false questions, enter written answers, autosave responses, and automatically submit when time expires
- Supabase Auth session persistence and row-level database access

## Supabase setup
The mobile app uses the project's public publishable key. It is safe to include in a client application; never add a Supabase service-role or secret key to the app.
For a different environment, set:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The app includes the current Academia Studio project URL and publishable key as public-client defaults. Authentication and database permissions are enforced by Supabase RLS.

The connected project supports the `student`, `teacher`, and `admin` profile roles. Teacher role assignment must be performed by an administrator; the app does not let a student promote themselves. The role constraint and admin-only role update policy have been applied directly to the connected database and must be captured in the project's versioned migration workflow before production deployment.

## Run locally
```bash
npm install
npx expo start
```

## Validation
```bash
npm run typecheck
npx expo-doctor
```

## Android APK
APK generation is intentionally deferred. The `preview` EAS profile can produce an installable APK when the project is ready and the required EAS build configuration is available.

## Important limitations
- File uploads and assignment attachments are not implemented.
- Exam answer keys remain teacher-only. Objective and written responses are saved, but automatic exam scoring and a full exam gradebook are not implemented.
- Teacher/admin interface for changing user roles is not included; role changes currently require an administrator to use the trusted database/admin workflow.
- ExamGenie live AI is a separate feature and requires its backend provider secret to be configured.
