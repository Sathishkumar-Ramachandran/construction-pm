# Construction PM — Singapore HDB Repair & Painting

A full-stack, production-ready project management system built specifically for Singapore HDB (Housing Development Board) repair and painting contracts. It covers the entire project lifecycle — from pre-start compliance through phased execution to completion — with role-based access, approval workflows, quality tracking, and regulatory compliance tooling.

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Architecture Overview](#architecture-overview)
3. [Getting Started](#getting-started)
4. [Environment Variables](#environment-variables)
5. [Database Schema](#database-schema)
6. [Authentication & Roles](#authentication--roles)
7. [Application Features](#application-features)
   - [Dashboard](#dashboard)
   - [Projects](#projects)
   - [Phase Workflow](#phase-workflow)
   - [Permits & Approvals](#permits--approvals)
   - [Documents](#documents)
   - [Material Submittals](#material-submittals)
   - [Defects & Quality Control](#defects--quality-control)
   - [Inspections](#inspections)
   - [Daily Reports](#daily-reports)
   - [Site Inspections](#site-inspections)
   - [Toolbox Meetings](#toolbox-meetings)
   - [Photos](#photos)
   - [Workers](#workers)
   - [Users & Team Management](#users--team-management)
   - [Notifications](#notifications)
8. [API Reference](#api-reference)
9. [Component Library](#component-library)
10. [Project Structure](#project-structure)
11. [Security Considerations](#security-considerations)
12. [Deployment](#deployment)

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router, React 19) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| ORM | Prisma |
| Database | PostgreSQL (Neon serverless) |
| Auth | JWT (access + refresh tokens), bcryptjs |
| State Management | Zustand |
| Data Fetching | SWR |
| Email | Resend |
| Date Utilities | date-fns |

---

## Architecture Overview

The app follows the Next.js App Router convention with a clean separation between:

- **`app/(auth)/`** — Public routes (login, accept invite)
- **`app/(dashboard)/`** — Protected routes behind an auth guard layout
- **`app/api/v1/`** — RESTful API routes (all server-side, JWT-protected)
- **`components/`** — Reusable UI and layout components
- **`lib/`** — Shared utilities, Prisma client, auth helpers, email, API client

**Request flow:**

```
Browser → Next.js Page (RSC / Client Component)
       → lib/api.ts (SWR fetch with auto token-refresh on 401)
       → app/api/v1/... (Route Handler)
       → lib/server/helpers.ts (auth check, role check)
       → Prisma → Neon PostgreSQL
```

**Auth flow:**

```
Login → access_token (8h) + refresh_token (30d)
     → stored in Zustand (localStorage)
     → 401 response → auto-refresh → retry original request
     → refresh failure → logout + redirect to /login
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A PostgreSQL database (Neon recommended)
- A [Resend](https://resend.com) account for transactional emails

### Installation

```bash
git clone <repo-url>
cd construction-pm
npm install
```

### Database Setup

```bash
# Push the Prisma schema to your database
npx prisma db push

# (Optional) Seed initial data
npx prisma db seed
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The root `/` redirects to `/dashboard`. Unauthenticated users are redirected to `/login`.

---

## Environment Variables

Create a `.env.local` file at the project root:

```env
DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require
JWT_SECRET=<random-256-bit-secret>
RESEND_API_KEY=re_<your-resend-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Important:** The database URL must never be hardcoded. Always use `process.env.DATABASE_URL`.

---

## Database Schema

The Prisma schema defines 24 models grouped into logical domains:

### Multi-Tenancy

| Model | Purpose |
|---|---|
| `Company` | Top-level tenant; all users and projects belong to a company |
| `User` | Team members with roles, invite/reset tokens, active status |
| `RefreshToken` | Persistent login sessions (30-day sliding window) |

### Project Core

| Model | Purpose |
|---|---|
| `Project` | Main entity — HDB block/street/town, contract details, TC info, status |
| `ProjectTeam` | Many-to-many between users and projects with project-level role |
| `ProjectPhase` | 7 sequential phases with locked/in_progress/completed status |
| `PhaseTask` | Individual checklist items within each phase |

### Compliance

| Model | Purpose |
|---|---|
| `Permit` | Regulatory permits (WAH, Road Closure, Noise Waiver, Scaffold Cert, etc.) |
| `Document` | Method statements, risk assessments, safe work procedures |
| `MaterialSubmittal` | Paint brands and repair materials requiring TC/consultant sign-off |
| `MaterialConsumption` | On-site usage records linked to a submittal |
| `RiskAssessment` / `RALineItem` | Structured RA documents with individual hazard line items |

### Operations

| Model | Purpose |
|---|---|
| `DailyReport` | Weather, attendance, work summary, issues, delays |
| `ToolboxMeeting` | Safety briefings with topics, hazards, controls |
| `ToolboxAttendance` | Worker sign-in records per meeting |
| `SiteInspection` | Condition reports (paint, plaster, cracking, spalling, scaffolding) |
| `Inspection` | Scheduled quality inspections with external inspector details |
| `Defect` | Quality issues with severity, location, rectification tracking |

### Supporting

| Model | Purpose |
|---|---|
| `Worker` | Trade workers (painter, plasterer, scaffolder, etc.) with WAH cert tracking |
| `Photo` | Project photos tagged to entities (defect, inspection, phase, etc.) |
| `Notification` | In-app user notifications with read status |
| `AuditLog` | Immutable change log for compliance |

---

## Authentication & Roles

### Auth Pages

| Route | Purpose |
|---|---|
| `/login` | Email/password login with remember-me option |
| `/accept-invite?token=` | First-time password setup for invited users |

### Token Strategy

- **Access token:** JWT, 8-hour expiry, contains `userId`, `companyId`, `role`
- **Refresh token:** Opaque random token, 30-day expiry, stored in `RefreshToken` table
- **Auto-refresh:** `lib/api.ts` intercepts `401` responses, calls `/auth/refresh`, retries

### Roles & Permissions

| Role | Capabilities |
|---|---|
| `super_admin` | Full system access across all companies |
| `company_admin` | Full access within their company |
| `project_manager` | Create/manage projects, approve daily reports |
| `supervisor` | Site operations, daily reports, toolbox meetings |
| `safety_officer` | Safety documents, risk assessments, defects |
| `consultant` | View/comment, document approvals, defect verification |
| `tc_officer` | Town Council officer — permit and material approvals |
| `worker` | Read-only, toolbox attendance |

Access checks are enforced on every API route handler via `lib/server/helpers.ts`.

---

## Application Features

### Dashboard

**Route:** `/dashboard`

The landing page after login. It displays:

- Personalised welcome with the user's first name
- **Summary stats:** Active projects, total projects, pending approvals, open defects
- **Recent projects grid:** Up to 6 projects with phase progress bars and status badges
- Quick-navigation links to all major sections

---

### Projects

**Routes:** `/projects` | `/projects/new` | `/projects/[id]`

#### Project List

- Card grid with pagination (20 per page)
- Filters: status (draft, pre_start, in_progress, on_hold, completed), HDB town (all 26 Singapore towns)
- Each card shows: project number, name, HDB location (Blk / Street / Town), current phase, planned dates, TC name

#### Create Project

Fields collected:

- Project number, name, project type (Painting / Waterproofing / Spalling Repair / Refurbishment / Others)
- HDB location: block, street, town (dropdown of 26 towns), postal code, number of floors
- Town council name and TC reference number
- Contract value, planned start/end dates
- Scope description

On creation, 7 project phases are auto-seeded with their default task checklists.

#### Project Detail

- Overall completion percentage with progress bar
- 7-phase workflow panel with per-phase completion % and status icons
- Quick-stat cards: approved permits, pending permits, documents, open defects, high-priority defects
- Phase unlock button (validates gate requirements before allowing progression)
- Direct links to: Permits, Documents, Materials, Defects

---

### Phase Workflow

Each project moves through 7 sequential phases:

| # | Phase | Description |
|---|---|---|
| 1 | Planning & Mobilisation | Pre-start checklist, team setup, permits obtained |
| 2 | Site Preparation | Hoarding, scaffolding, protection works |
| 3 | Hacking & Repair | Spalling, hollow plaster, crack repair |
| 4 | Plastering | Skim coat, levelling, surface preparation |
| 5 | Priming | Primer application, surface inspection |
| 6 | Painting | Finishing coats, touch-ups |
| 7 | Cleaning & Dismantling | Scaffold down, site reinstatement, handover |

**Gating mechanism:** A phase cannot be unlocked until all gate requirements from the previous phase are satisfied. The API returns a structured list of unmet requirements when an unlock is attempted prematurely.

---

### Permits & Approvals

**Route:** `/projects/[id]/permits`

#### Permit Types

- TC Approval
- Work-at-Heights (WAH) Permit
- Road Closure Permit
- Noise Waiver
- Scaffold Certificate
- Gondola Permit
- Permit to Work

#### Fields

- Issuing authority, reference number
- Applied date, issued date, expiry date
- Supporting document upload
- Notes

#### Status Workflow

```
draft → submitted → approved
                 → rejected (with reason)
```

Approval records: approved date, expiry date.
Rejection records: rejection reason.

---

### Documents

**Route:** `/projects/[id]/documents`

#### Document Types

- Method Statement
- Risk Assessment
- Safe Work Procedure
- Site Inspection Report
- Toolbox Meeting Record
- Daily Report
- Inspection Report
- Defect Report
- Completion Report

#### Features

- Version tracking (v1.0, v2.0 — increments on re-submission after rejection)
- File upload with stored filename
- Approval workflow (same draft → submitted → approved/rejected pattern)
- Approval and rejection remarks stored

---

### Material Submittals

**Route:** `/projects/[id]/materials`

#### Paint Brands Supported

Jotun, Nippon Paint, Dulux, Sika, Fosroc, Mapei, Others

#### Material Categories

Primers, Sealers, Finishing Paint, Weathercoat, Elastomeric, Emulsion, Fillers, Protective Coatings

#### Submittal Fields

- Product name, brand, color code, color name, TC colour reference
- Quantity and unit (litre, kg, bag, tin, m²)
- Application area (External Wall, Internal, Ceiling, Corridor, Void Deck, Roof)
- TDS/SDS document upload

#### Consumption Tracking

Once a material is approved, on-site usage can be recorded:

- Date used, quantity used
- Area applied (m²), batch number
- Linked to the parent submittal

#### Approval Workflow

Same as Documents — draft → submitted → approved/rejected, with remarks.

---

### Defects & Quality Control

**Route:** `/projects/[id]/defects`

#### Defect Types

Peeling Paint, Uneven Colour, Cracks, Hollow Plaster, Spalling Concrete, Efflorescence, Water Stains, Dirty Surfaces, Missed Areas, Bleed-Through

#### Severity Levels

| Level | Colour | Meaning |
|---|---|---|
| High | Red | Structural or safety concern, urgent rectification |
| Medium | Yellow | Quality issue requiring prompt attention |
| Low | Green | Minor cosmetic defect |

#### Defect Lifecycle

```
open → in_progress → rectified → verified_ok
```

- Auto-numbered: DEF-001, DEF-002, …
- Location zone and description captured
- Target rectification date set at raise time
- **Raise:** project managers, supervisors, safety officers, consultants, TC officers
- **Verify:** project managers, consultants, safety officers, TC officers

---

### Inspections

**Route:** `/projects/[id]/inspections`

Scheduled or ad-hoc quality inspections carried out by external parties or internal QA:

- Inspector name, company, contact
- Scheduled date, completed date
- Inspection items and findings
- Sign-off with digital signature
- Status: scheduled → in_progress → completed → signed_off

---

### Daily Reports

**Route:** `/projects/[id]/daily-reports`

Site supervisors submit daily reports capturing:

- **Weather:** Condition (sunny, cloudy, rainy, stormy), temperature, humidity
- **Workers:** List of workers present that day with trades
- **Work Summary:** Areas worked, activities completed
- **Issues & Delays:** Any site problems or delays
- **Materials Used:** Quantities consumed

Workflow:
```
draft → submitted → acknowledged (by project manager)
```

A convenience endpoint `GET /daily-reports/today` returns the current day's report if one exists.

---

### Site Inspections

**Route:** `/projects/[id]/site-inspections`

Condition assessment reports covering:

- Paint condition (peeling, chalking, staining, fading)
- Plaster condition (hollow, cracks, delamination)
- Concrete condition (spalling, exposed rebar)
- Scaffolding condition
- Overall site safety observations

Status: draft → submitted

---

### Toolbox Meetings

**Route:** `/projects/[id]/toolbox-meetings`

Safety toolbox meetings held before work commences:

- Meeting date, time, location
- Topics covered
- Hazards identified and control measures
- Worker attendance records (sign-in per worker)
- Conductor name and sign-off
- Status: draft → conducted → signed_off

---

### Photos

**Route:** `/projects/[id]/photos`

Photographic evidence linked to any entity in the system:

- Single or bulk upload
- Metadata: caption, location, date taken, photographer
- Entity linking: defect, inspection, phase, daily report, site inspection
- Photo types: progress, defect, before/after, compliance

---

### Workers

**Route:** `/workers`

Company-level pool of trade workers:

| Field | Values |
|---|---|
| Trade | Painter, Plasterer, Waterproofer, Scaffolder, General Worker, Supervisor, Others |
| Nationality | Free text |
| ID | FIN / Work Permit number |
| WAH Certified | Yes/No, with expiry date |
| Status | Active / Inactive |

Workers are assigned to projects and tracked in toolbox attendance records.

---

### Users & Team Management

**Route:** `/users`

#### Inviting Users

Admins invite users by email. An invite email is sent via Resend containing a tokenised link to `/accept-invite`. The invited user sets their own password on first login.

#### User Fields

- Full name, email, phone
- Role (see Roles table above)
- Active/Inactive status
- Last login timestamp
- Invite pending indicator

#### Actions

- Invite new user
- Activate / Deactivate existing user

#### Project Team

Each project has its own team subset managed at `/projects/[id]/team`. Team members are drawn from the company user pool and given a project-level role assignment.

---

### Notifications

Real-time in-app notifications are surfaced in the header bell icon (polls every 30 seconds):

- Unread count badge
- Notification list with entity deep-link
- Mark individual or all as read

Notifications are generated server-side on key events: defect raised, document submitted, permit approved/rejected, etc.

---

## API Reference

All API routes are under `/api/v1/` and require a valid `Authorization: Bearer <access_token>` header.

### Authentication

| Method | Route | Description |
|---|---|---|
| POST | `/auth/login` | Email/password login; returns tokens + user |
| POST | `/auth/logout` | Invalidate refresh token |
| POST | `/auth/refresh` | Exchange refresh token for new access token |
| POST | `/auth/invite` | Admin invites user by email |
| POST | `/auth/accept-invite` | User accepts invite and sets password |
| POST | `/auth/forgot-password` | Send password reset email |
| POST | `/auth/reset-password` | Reset password via token |
| GET | `/auth/me` | Current user profile |
| POST | `/auth/me/password` | Change own password |
| GET | `/auth/users` | List all company users |
| PATCH | `/auth/users/[userId]/activate` | Reactivate a user |
| PATCH | `/auth/users/[userId]/deactivate` | Deactivate a user |

### Projects

| Method | Route | Description |
|---|---|---|
| GET | `/projects` | List projects (filters: status, hdb_town; pagination) |
| POST | `/projects` | Create project (admin/PM only) |
| GET | `/projects/[id]` | Project detail with phases |
| PATCH | `/projects/[id]` | Update project fields |

### Phases & Tasks

| Method | Route | Description |
|---|---|---|
| GET | `/projects/[id]/phases` | List all phases |
| PATCH | `/projects/[id]/phases/[phaseId]` | Update phase |
| POST | `/projects/[id]/phases/[phaseId]/unlock` | Gate-check and unlock phase |
| GET | `/projects/[id]/phases/[phaseId]/tasks` | List phase tasks |
| POST | `/projects/[id]/phases/[phaseId]/tasks` | Create task |
| PATCH | `/projects/[id]/phases/[phaseId]/tasks/[taskId]` | Update task |
| POST | `/projects/[id]/phases/[phaseId]/tasks/[taskId]/complete` | Complete task |

### Defects

| Method | Route | Description |
|---|---|---|
| GET | `/projects/[id]/defects` | List (filters: status, severity) |
| POST | `/projects/[id]/defects` | Raise defect |
| GET | `/projects/[id]/defects/[defectId]` | Defect detail |
| PATCH | `/projects/[id]/defects/[defectId]` | Update |
| POST | `/projects/[id]/defects/[defectId]/rectify` | Mark rectified |
| POST | `/projects/[id]/defects/[defectId]/verify` | Verify rectification |

### Documents

| Method | Route | Description |
|---|---|---|
| GET | `/projects/[id]/documents` | List documents |
| POST | `/projects/[id]/documents` | Create |
| GET | `/projects/[id]/documents/[docId]` | Detail |
| PATCH | `/projects/[id]/documents/[docId]` | Update |
| POST | `/projects/[id]/documents/[docId]/submit` | Submit for approval |
| POST | `/projects/[id]/documents/[docId]/approve` | Approve |
| POST | `/projects/[id]/documents/[docId]/reject` | Reject with reason |
| POST | `/projects/[id]/documents/[docId]/upload` | Upload file |

### Materials

| Method | Route | Description |
|---|---|---|
| GET | `/projects/[id]/materials` | List submittals |
| POST | `/projects/[id]/materials` | Create submittal |
| GET | `/projects/[id]/materials/[materialId]` | Detail |
| PATCH | `/projects/[id]/materials/[materialId]` | Update |
| POST | `/projects/[id]/materials/[materialId]/submit` | Submit |
| POST | `/projects/[id]/materials/[materialId]/approve` | Approve |
| POST | `/projects/[id]/materials/[materialId]/reject` | Reject |
| POST | `/projects/[id]/materials/[materialId]/upload-tds` | Upload TDS/SDS |
| GET | `/projects/[id]/materials/consumption` | List consumption records |

### Permits

| Method | Route | Description |
|---|---|---|
| GET | `/projects/[id]/permits` | List permits |
| POST | `/projects/[id]/permits` | Create |
| GET | `/projects/[id]/permits/[permitId]` | Detail |
| PATCH | `/projects/[id]/permits/[permitId]` | Update |
| POST | `/projects/[id]/permits/[permitId]/submit` | Submit |
| POST | `/projects/[id]/permits/[permitId]/approve` | Approve (with dates) |
| POST | `/projects/[id]/permits/[permitId]/reject` | Reject with reason |
| POST | `/projects/[id]/permits/[permitId]/upload` | Upload document |

### Inspections

| Method | Route | Description |
|---|---|---|
| GET | `/projects/[id]/inspections` | List |
| POST | `/projects/[id]/inspections` | Create |
| GET | `/projects/[id]/inspections/[inspId]` | Detail |
| PATCH | `/projects/[id]/inspections/[inspId]` | Update |
| POST | `/projects/[id]/inspections/[inspId]/complete` | Mark complete |
| POST | `/projects/[id]/inspections/[inspId]/sign-off` | Sign off |

### Daily Reports

| Method | Route | Description |
|---|---|---|
| GET | `/projects/[id]/daily-reports` | List |
| POST | `/projects/[id]/daily-reports` | Create |
| GET | `/projects/[id]/daily-reports/today` | Today's report |
| GET | `/projects/[id]/daily-reports/[reportId]` | Detail |
| PATCH | `/projects/[id]/daily-reports/[reportId]` | Update |
| POST | `/projects/[id]/daily-reports/[reportId]/submit` | Submit |
| POST | `/projects/[id]/daily-reports/[reportId]/acknowledge` | PM acknowledges |

### Toolbox Meetings

| Method | Route | Description |
|---|---|---|
| GET | `/projects/[id]/toolbox-meetings` | List |
| POST | `/projects/[id]/toolbox-meetings` | Create |
| GET | `/projects/[id]/toolbox-meetings/[meetingId]` | Detail |
| PATCH | `/projects/[id]/toolbox-meetings/[meetingId]` | Update |
| GET | `/projects/[id]/toolbox-meetings/[meetingId]/attendance` | Attendance list |
| POST | `/projects/[id]/toolbox-meetings/[meetingId]/attendance` | Record attendance |
| PATCH | `/projects/[id]/toolbox-meetings/[meetingId]/attendance/[workerId]` | Update worker record |
| POST | `/projects/[id]/toolbox-meetings/[meetingId]/sign-off` | Sign off meeting |

### Photos

| Method | Route | Description |
|---|---|---|
| GET | `/projects/[id]/photos` | List (filter by entity) |
| POST | `/projects/[id]/photos` | Upload photo |
| POST | `/projects/[id]/photos/upload` | Bulk upload |
| GET | `/projects/[id]/photos/[photoId]` | Detail |
| DELETE | `/projects/[id]/photos/[photoId]` | Delete |

### Workers

| Method | Route | Description |
|---|---|---|
| GET | `/workers` | Company worker list |
| POST | `/workers` | Create worker |
| GET | `/workers/[workerId]` | Detail |
| PATCH | `/workers/[workerId]` | Update |
| PATCH | `/workers/[workerId]/deactivate` | Deactivate |
| GET | `/projects/[id]/workers` | Project-assigned workers |
| POST | `/projects/[id]/workers` | Assign worker to project |
| DELETE | `/projects/[id]/workers/[workerId]` | Remove assignment |

### Reports & Analytics

| Method | Route | Description |
|---|---|---|
| GET | `/projects/[id]/reports/dashboard` | Completion %, summary stats |
| GET | `/projects/[id]/reports/progress` | Per-phase progress |
| GET | `/projects/[id]/reports/defects` | Defect breakdown |
| GET | `/projects/[id]/reports/compliance` | Compliance checklist |

### Notifications

| Method | Route | Description |
|---|---|---|
| GET | `/notifications` | User notification list |
| GET | `/notifications/unread-count` | Unread badge count |
| POST | `/notifications/[notificationId]/read` | Mark as read |
| POST | `/notifications/read-all` | Mark all as read |

---

## Component Library

All components live in `components/` and are fully typed with TypeScript.

### Layout Components

**`components/layout/header.tsx`**
- Page title and optional subtitle
- Action button slot (rendered at top-right)
- Notification bell with live unread count (polls every 30 seconds)

**`components/layout/sidebar.tsx`**
- Collapsible navigation menu
- Role-based link visibility
- User avatar, name, role display
- Logout button

### UI Components

**`components/ui/button.tsx`**

| Prop | Values |
|---|---|
| `variant` | `primary`, `secondary`, `danger`, `ghost`, `outline` |
| `size` | `sm`, `md`, `lg` |
| `loading` | `boolean` — shows spinner, disables button |

**`components/ui/card.tsx`**
Wrapper with `CardHeader`, `CardContent`, and `CardTitle` sub-components.

**`components/ui/badge.tsx`**
Colour-coded status badges. Status-to-colour mappings are pre-defined (e.g. `approved` → green, `rejected` → red, `high` severity → red).

**`components/ui/input.tsx`** / **`components/ui/select.tsx`** / **`components/ui/textarea.tsx`**
Labelled form controls with consistent styling and error state support.

**`components/ui/modal.tsx`**
Dialog overlay with `title`, `footer`, and close handler. Traps focus.

**`components/ui/loading.tsx`**
- `Spinner` — inline loading indicator
- `PageLoader` — full-page loading state
- `EmptyState` — illustrated empty list placeholder
- `ErrorBanner` / `SuccessBanner` — feedback banners

---

## Project Structure

```
construction-pm/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── accept-invite/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                  # Auth guard, sidebar + header shell
│   │   ├── dashboard/page.tsx
│   │   ├── users/page.tsx
│   │   ├── workers/page.tsx
│   │   └── projects/
│   │       ├── page.tsx                # Project list
│   │       ├── new/page.tsx            # Create project
│   │       └── [projectId]/
│   │           ├── page.tsx            # Project detail
│   │           ├── permits/page.tsx
│   │           ├── documents/page.tsx
│   │           ├── materials/page.tsx
│   │           └── defects/page.tsx
│   ├── api/v1/
│   │   ├── auth/                       # 12 auth endpoints
│   │   ├── projects/                   # 90+ project subroutes
│   │   ├── workers/                    # 5 worker endpoints
│   │   └── notifications/              # 4 notification endpoints
│   ├── globals.css
│   ├── layout.tsx                      # Root layout (font, metadata)
│   └── page.tsx                        # Redirects to /dashboard
├── components/
│   ├── layout/
│   │   ├── header.tsx
│   │   └── sidebar.tsx
│   └── ui/
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── loading.tsx
│       ├── modal.tsx
│       ├── select.tsx
│       └── textarea.tsx
├── lib/
│   ├── api.ts                          # Fetch wrapper with auto token-refresh
│   ├── auth-store.ts                   # Zustand auth state (localStorage)
│   ├── db.ts                           # Prisma client singleton
│   ├── utils.ts                        # Helpers, Singapore HDB town constants
│   └── server/
│       ├── auth.ts                     # JWT sign/verify, token generation
│       ├── helpers.ts                  # requireAuth(), requireRole(), JSON responses
│       ├── email.ts                    # Resend email templates
│       └── project-service.ts          # Phase/task seeding logic
├── prisma/
│   └── schema.prisma                   # 24 models
├── CLAUDE.md / AGENTS.md
├── next.config.*
├── tailwind.config.*
├── tsconfig.json
└── package.json
```

---

## Security Considerations

- **JWT tokens** are signed with `JWT_SECRET` and expire after 8 hours
- **Refresh tokens** are stored in the database and invalidated on logout
- **Passwords** are hashed with bcryptjs (salt rounds: 12)
- **Role checks** are enforced server-side on every API handler — client-side UI hiding is supplementary only
- **Multi-tenancy isolation** — all queries filter by `companyId` derived from the verified JWT
- **Project-level access** — users can only access projects they are a team member of (or company admins/super admins)
- **Invite tokens** are single-use and expire — attempting to reuse returns a 400
- **Password reset tokens** are time-limited

---

## Deployment

### Vercel (Recommended)

1. Push repository to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Set environment variables in the Vercel dashboard
4. Deploy — Vercel handles the build and serverless function routing automatically

### Other Platforms

Any platform supporting Node.js and serverless/edge functions can host this app. Ensure:

- Environment variables are set (see [Environment Variables](#environment-variables))
- The PostgreSQL database is accessible from the deployment region
- File uploads (photos, documents) are directed to cloud storage (S3/Cloudflare R2) rather than the local filesystem in production
