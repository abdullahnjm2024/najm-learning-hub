# نظام نجم التعليمي — Najm Educational System

## Overview

Full-stack bilingual (Arabic/English) educational platform. Students access a structured learning path (Subject → Unit → Lesson) with strict 70% quiz gating, rich media lessons, YouTube videos, Google Form exams, a stars leaderboard, and notifications. Admins create and manage the LMS content via a WYSIWYG-enabled course editor.

## Architecture

pnpm workspace monorepo using TypeScript:
- `artifacts/najm-edu` — React + Vite frontend (Arabic RTL)
- `artifacts/api-server` — Express 5 API server (port 8080)
- `lib/db` — PostgreSQL + Drizzle ORM schema
- `lib/api-spec` — OpenAPI spec (source of truth)
- `lib/api-client-react` — Generated React Query hooks (Orval)
- `lib/api-zod` — Generated Zod schemas (Orval)

## Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: 24, **TypeScript**: 5.9
- **Frontend**: React + Vite + Tailwind CSS + Wouter (routing)
- **API**: Express 5, JWT auth (30-day tokens in localStorage)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod v4, drizzle-zod
- **API codegen**: Orval

## RBAC Admin System

Separate authentication system for the educational administration (إدارة), using a distinct JWT with `type: "staff"` claim.

**Roles**: `teacher`, `supervisor`, `super_admin`

**Login flow**: Unified through the Student Login Modal. Selecting "الإدارة (Administration)" from the dropdown sets the ADMIN- prefix. On submit, if the identifier starts with ADMIN-, the request goes to `/api/staff/auth/login` using `adminId` + `password`, returning a staff JWT and redirecting to `/admin-dashboard`.

**Key files**:
- `lib/db/src/schema/staff.ts` — `staffTable` (uses `admin_id` not email) + `staffRoleEnum`
- `artifacts/api-server/src/routes/staff_auth.ts` — `/staff/auth/login` (adminId+password), `/staff/auth/me`
- `artifacts/api-server/src/routes/staff_management.ts` — CRUD for admins (super_admin only)
- `artifacts/api-server/src/middlewares/authenticate.ts` — `authenticateStaff`, `requireSuperAdmin`
- `artifacts/api-server/src/lib/auth.ts` — `signStaffToken`, `verifyStaffToken`
- `artifacts/api-server/src/index.ts` — auto-seeds ADMIN-000 on startup
- `artifacts/najm-edu/src/contexts/StaffAuthContext.tsx` — `StaffAuthProvider`, `useStaffAuth`
- `artifacts/najm-edu/src/pages/super-admin/staff-management.tsx` — Admin dashboard (`/admin-dashboard`)

**Default super admin**: `ADMIN-000` / `admin` (auto-seeded on API startup)

**Authorization layers**:
- `authenticateStaff` — required for ALL admin write routes (POST/PUT/DELETE on lessons, units, subjects, exams, notifications, prizes, site-settings, users)
- `authenticate` — required for student read routes (GET lessons, units, subjects, exams)
- `requireSuperAdmin` — used exclusively on staff management routes
- Note: Legacy `authenticateAdminOrSuperStaff`, `requireAdmin`, and `requireAdminAccess` have been fully removed. All admin access is now exclusively through staff JWTs.

**Frontend auth**:
- `main.tsx`: `setAuthTokenGetter` returns `najm_token` (user) or falls back to `najm_staff_token` (staff)
- `StaffAuthContext`: restores session on reload via `/staff/auth/me`
- `ProtectedRoute`: accepts staff super_admin for `adminOnly` routes
- `Layout`: shows admin sidebar with "إدارة الكادر الإداري" tab when staff is super_admin
- Staff management moved from `/admin-dashboard` to `/admin/staff-management` (old URL redirects)

## Features

- JWT authentication (register/login/me)
- **6 canonical grade tracks**: grade9 (yellow/amber), grade12_sci (light red #EF4444), grade12_lit (coral/peach #F97066), english (blue), ielts (purple), steps1000 (light green #22C55E)
- **LMS V2.0 Hierarchical Structure**: Subjects → Units → Lessons with sequential Duolingo-style unlocking
  - Admin: `/admin/subjects` — 3-column hierarchy manager (subjects, units, lessons CRUD + reorder)
  - Student: `/lessons` — Subject cards → Unit panels → Lesson sequence with lock icons + progress bars
  - `GET /api/subjects`, `POST /api/subjects`, `PUT /api/subjects/:id`, `DELETE /api/subjects/:id`
  - `GET /api/units`, `POST /api/units`, `PUT /api/units/:id`, `DELETE /api/units/:id`
  - `GET /api/units/:id/lessons` — returns lessons with `isCompleted` and `isLocked` fields
  - `POST /api/progress/lessons/:lessonId` — mark lesson complete (checks sequential lock)
  - `GET /api/progress/subjects/:subjectId` — returns completedLessons/totalLessons
- **Multimodal lesson content**: YouTube video, audio player, image, rich text (Arabic + English), linked quiz (exam)
- YouTube video lessons (free & paid) — legacy flat list still at `/admin/lessons`
- Google Form exam embeds
- Best-score exam tracking with stars rewards
- Stars leaderboard with per-track isolation (students see their own track; admins can switch)
- Notifications system with read tracking
- **Admin dashboard**:
  - Students: Create / Edit / Delete with confirmation modal; inline stars editing; role switching
  - Subjects (LMS v2): 3-panel hierarchy manager with multimodal lesson form
  - Lessons (legacy): grade-filtered flat list management
  - Notifications: send per-track or broadcast
- Access roles: `free`, `paid` (admin role removed — all admin access is through the dedicated staff system)
- Webhook sync: `POST /api/webhook/sync-student` and `POST /api/webhook/update-stars`
- All admin write routes now protected exclusively by `authenticateStaff` (staff JWT)

## Admin Credentials

- Email: abdullahnjm2024@gmail.com
- Password: abdullahnjm2002

## Key Commands

- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes
- Admin seeded via `/tmp/seed-admin.mjs` script

## Design System — "Academic Prism"

- **Theme**: Light mode — surface `#F4F6FF`, on-surface `#212F43`, on-surface-variant `#4E5C71`
- **Fonts**: Plus Jakarta Sans (headlines) + Manrope (body) + IBM Plex Sans Arabic (Arabic fallback)
- **Glassmorphism**: Header uses `rgba(244,246,255,0.75)` + `backdrop-filter: blur(16px)`
- **Layout**: Fixed right sidebar (264px, RTL) + glassmorphism mobile header
- **Grade theming**: Dynamically applied via `html[data-grade]` CSS attribute set in Layout
- **Logos**: 6 PNG logos in `artifacts/najm-edu/public/images/` — logo-main, logo-grade9, logo-baccalaureate, logo-outcomes, logo-steps1000, logo-ielts
- **Lesson view**: Bento grid (8-col video + 4-col info panel)
- **GRADE_CONFIG** in `lib/utils.ts`: fields are `primary`, `onPrimary`, `primaryLight`, `gradientFrom`, `surface`, `surfaceLow`, `logo`, `sidebarTitle`, `sidebarSubtitle`, `labelAr`, `label`, `icon`
- **Login page**: Full landing page with hero + 6 section cards + stats + About Us + Intro Video (YouTube embed) + Prizes grid; login via modal; nav links to all sections
- **3D/Modern UI**: `.card-3d` and `.hover-lift` CSS utility classes for shadow + translate hover effects on cards globally

## Phase 4 — Branding, Landing Page & Admin CMS (complete)

- **Grade color updates**: grade12_sci → Light Red (#EF4444), grade12_lit → Coral/Peach (#F97066), steps1000 → Light Green (#22C55E)
- **Landing page sections**: About Us (من نحن) with feature cards, Intro Video (YouTube embed, only shown if URL set), Prizes grid (hidden if empty)
- **WhatsApp support button**: Shown on student dashboard (home page) as a green gradient banner — links to configurable phone number
- **Admin Site Settings page** (`/admin/site-settings`): Edit WhatsApp phone, About Us text, Intro Video YouTube URL, CRUD for Prizes list
- **DB tables**: `site_settings` (key/value), `prizes` (id, name, nameAr, imageUrl, icon, requiredStars, orderIndex)
- **API routes**: `GET /api/site-settings` (public), `PUT /api/site-settings/:key` (admin), `GET /api/prizes` (public), `POST /api/prizes`, `PUT /api/prizes/:id`, `DELETE /api/prizes/:id` (admin)

## Admin Features

- **Impersonation**: `POST /api/users/:studentId/impersonate` (admin-only) — returns a 2-hour JWT for any student without needing their password. Frontend has a "دخول" button per student in the admin Students page that calls this endpoint, stores the student's token, and navigates to `/`.
- **Google Sheets Sync Webhook**: `POST /api/webhook/sync-student` — accepts `{ studentId, fullName, phone, gradeLevel }` with `x-webhook-secret` header. Creates student (default pw: `123456`) or updates existing. See `artifacts/api-server/src/routes/sync.ts`.
- **Change Password**: `POST /api/auth/change-password` — requires `{ currentPassword, newPassword }`. Available in the Profile page UI.

## PWA (Progressive Web App)

Configured via `vite-plugin-pwa` using the `injectManifest` strategy:
- **`src/sw.ts`** — Combined service worker (Workbox precaching + push notification handlers). Compiled during production build and output to `dist/public/sw.js` (overwriting the dev-only `public/sw.js`).
- **`public/sw.js`** — Dev-only push notification SW (used in dev mode only; replaced by the compiled combined SW in production).
- **`public/pwa-icon.svg`** — Navy (#1d2b49) rounded-square star icon for "Add to Home Screen".
- **Manifest**: name="نجم - Najm Learning", short_name="Najm", theme_color="#1d2b49", standalone display, RTL Arabic.
- **`injectManifest.maximumFileSizeToCacheInBytes: 4 MiB`** — required because `minify: false` makes the main JS bundle ~2.3 MB.
- Push notification registration in `src/hooks/usePushNotifications.ts` registers `/sw.js` — this same URL is used by VitePWA in production, so no conflict.

## Auth

JWT stored in `localStorage` key `najm_token`. Auth token getter set in `main.tsx` via `setAuthTokenGetter()` so all API requests include Bearer token automatically.
