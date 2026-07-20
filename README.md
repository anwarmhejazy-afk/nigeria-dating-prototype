# AfroLove

**One Africa. Real Connections.**

AfroLove is a premium pan-African dating application built for meaningful
connections across Africa and the African diaspora.

## Technology

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- Supabase Authentication, Postgres, Realtime and Storage
- Vercel hosting

## Current functionality

- Secure email registration, confirmation, login and password recovery
- Protected member application
- Four-step profile onboarding
- Profile photo uploads with Supabase Storage
- Country, region, city, culture and language profile details
- Persistent likes, passes and Super Likes
- Automatic mutual matching
- Real-time private messaging
- Unmatch, block and report controls
- Premium mobile-first interface
- Showcase profiles for client presentations

## Brand assets

Brand files are stored in `public/brand/`:

- `afrolove-app-icon.png`
- `afrolove-logo-dark.png`
- `afrolove-logo-light.png`
- `afrolove-logo-monochrome.png`

The browser and application icon is also available through `app/icon.png`.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

Create `.env.local` with:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Never commit `.env.local`, database passwords, service-role keys or Personal
Access Tokens.

## Phase 6 — Installable PWA and Notifications

AfroLove now includes a web-app manifest, service worker, install guidance, offline fallback, browser push-subscription management, notification preferences, in-app activity records, safety/verification notifications, legal pages, 18+ consent and noindex protection for the administration area.

Required server environment variables:

```text
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
PUSH_DELIVERY_SECRET
```
