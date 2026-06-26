# LMS Platform

Invite-only learning management platform (single content owner) serving two
learner populations: corporate-affiliated learners (grouped under
organizations with seat pools) and individually invited learners.

> Business requirements live in the project's BRD (see [`docs/README.md`](docs/README.md)
> for where to place/link it). Requirement IDs referenced throughout this
> codebase (e.g. `ACC-01`, `TRK-04`) map directly to that document — see
> [Requirement Traceability](#requirement-traceability) below.

## Status

🚧 Pre-implementation scaffold. Business requirements confirmed. Tech stack
confirmed as Next.js + PostgreSQL + Prisma + Auth.js. Full technical design
(data model refinement, API contracts) in progress.

## Tech Stack

- **Framework:** Next.js 15 (App Router), TypeScript, React 19
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** Auth.js (NextAuth) — credentials provider, JWT sessions, role-based access
- **PDF generation:** pdf-lib (certificates, `CERT-01`)
- **Validation:** Zod
- _Video/SCORM storage and streaming approach is still pending — see Open Questions in the BRD._

## Core Pillars → Code Mapping

| Pillar | Req. ID prefix | Where it lives |
|---|---|---|
| Database | `DB-` | `prisma/schema.prisma` |
| Login | `AUTH-` | `src/lib/auth.ts`, `src/middleware.ts` |
| Access & Invitations | `ACC-` | `Invitation` model in schema; org-scoped queries throughout |
| Course Authoring | `CRS-` | `Course` / `Section` / `Lesson` / `CourseGrant` models |
| Tracking | `TRK-` | `Progress` model; SCORM data stored as JSON on `Progress.scormData` |
| Reviewing (Assessment) | `REV-` | `Quiz` / `QuizQuestion` / `QuizAttempt` models |
| Certificates | `CERT-` | `Certificate` model; PDF generation via pdf-lib |

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment template and fill in real values
cp .env.example .env.local

# Start a local Postgres (example via Docker; adjust as needed)
docker run --name lms-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=lms_platform -p 5432:5432 -d postgres:16

# Run migrations
npx prisma migrate dev --name init

# Start the dev server
npm run dev
```

Visit `http://localhost:3000`.

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/        # Public auth pages
│   ├── (dashboard)/
│   │   ├── owner/           # Owner/Platform Admin views (role-gated)
│   │   ├── org-admin/       # Org Admin views (role-gated, org-scoped)
│   │   └── learner/         # Learner views
│   └── api/auth/[...nextauth]/  # Auth.js route handler
├── lib/
│   ├── auth.ts              # NextAuth config (providers, callbacks, RBAC claims)
│   └── prisma.ts            # Prisma client singleton
├── middleware.ts            # Route-level RBAC enforcement
└── types/next-auth.d.ts     # Session/JWT type augmentation (role, organizationId)

prisma/
└── schema.prisma            # Full data model, annotated with requirement IDs
```

**Important convention:** route-level middleware is only the first line of
defense. Every server action / API route that touches Organization-scoped
data (Org Admin views, course grants, learner rosters) must independently
filter by `session.user.organizationId` — never trust a client-supplied
`organizationId`. This is what keeps `ACC-05` (Org Admin data isolation)
actually true, not just assumed.

## Requirement Traceability

When opening a PR or commit that implements a specific requirement,
reference its ID, e.g.:

```
feat(auth): implement password reset flow (AUTH-04)
```

## Branching Strategy

- `main` — always deployable
- `feature/<req-id>-short-description` — e.g. `feature/TRK-04-scorm-tracking`

## Contributing

Single-owner project currently. Issue templates under
`.github/ISSUE_TEMPLATE/` are pre-tagged with requirement-ID fields to keep
work traceable as the project grows.
