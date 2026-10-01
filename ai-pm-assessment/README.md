# AI Product Management — RAG & AI Application Assessment

A standalone web assessment (15 questions) with server-side scoring and a protected instructor dashboard.
Built with Next.js, TypeScript, Tailwind CSS and Prisma (SQLite locally, PostgreSQL/Supabase in production).
Students need no account. They enter a name and email, take the assessment, and see only their score.

## 1. Prerequisites

- Node.js 20.9 or newer (`node -v`)
- npm 10 or newer
- For production: a PostgreSQL database (Supabase, Neon, Vercel Postgres, …) and a Vercel account

## 2. Installation

```bash
git clone <your-repo-url>
cd ai-pm-assessment
npm install
```

`npm install` also generates the Prisma client.

## 3. Environment variables

Copy the template and fill it in:

```bash
cp .env.example .env
```

| Variable         | Purpose                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------- |
| `DATABASE_URL`   | `file:./dev.db` for local SQLite, or a `postgresql://…` URL for production                    |
| `ADMIN_EMAIL`    | Instructor login email                                                                        |
| `ADMIN_PASSWORD` | Instructor password: plaintext, or (recommended) a scrypt hash from `npm run hash-password -- '<password>'` |
| `SESSION_SECRET` | Random string of at least 32 characters used to sign the session cookie                       |
| `DIRECT_URL`     | *Optional, Postgres only*: a direct (non-pooled) URL for schema changes, e.g. on Supabase     |

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

> **Shortcut:** if `.env` does not exist, `npm run dev` creates one with local defaults: SQLite, `instructor@example.com` and a random password, which it prints to the terminal. `.env` is git-ignored. Never commit it.

## 4. Database setup

Local development uses SQLite. Apply the committed migrations:

```bash
npx prisma migrate deploy
```

When you change `prisma/schema.prisma`, create a new migration with:

```bash
npx prisma migrate dev --name <change-name>
```

`prisma/schema.prisma` is the only schema definition. When `DATABASE_URL` is a PostgreSQL URL, the build scripts derive a PostgreSQL copy automatically (`prisma/postgres/schema.prisma`, git-ignored). Switching databases needs no code changes.

## 5. Seed database

```bash
npx prisma db seed
```

This loads the assessment, all 15 questions, the options and the answer key from `prisma/seed-data.ts`. The seed is idempotent, so you can re-run it safely. Option IDs stay stable, so existing submissions remain valid.

`npm run db:deploy` does steps 4 and 5 in one command, for either database.

## 6. Run locally

```bash
npm run dev
```

Open http://localhost:3000. Other scripts:

```bash
npm run build      # production build
npm run start      # serve the production build
npm test           # unit tests (scoring, auth, validation, CSV)
npm run test:e2e   # API end-to-end checks against a running server (BASE_URL, default http://localhost:3000)
npm run check:bundle  # after a build: proves no answer-key data is in the client JavaScript
```

## 7. Instructor login

- URL: http://localhost:3000/admin (redirects to `/admin/login`)
- Credentials: `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`
- Sessions use an HMAC-signed, HttpOnly, `SameSite=Strict` cookie (and `Secure` in production). They last 8 hours.

The dashboard shows:

- Summary statistics and the score distribution
- Per-question accuracy, sorted from hardest to easiest, with how often each option was picked
- A sortable, filterable student table
- **Export CSV**: one row per student with per-question correctness (1/0)

## 8. Student assessment URL

- http://localhost:3000/ (in production: `https://<your-app>.vercel.app/`)

Share this URL with students. Each student can submit **once per email address**. After submitting they see only their score, percentage and a feedback message, never the answers.

## 9. Production deployment instructions

SQLite is not suitable on Vercel, because the filesystem is read-only and ephemeral. Use PostgreSQL in production.

1. **Create a PostgreSQL database.** On Supabase: *Project → Connect*.
   - `DATABASE_URL`: the **transaction pooler** URL (port 6543). Append `?pgbouncer=true&connection_limit=1`.
   - `DIRECT_URL`: the **session pooler** or direct URL (port 5432).
2. **Push the code to GitHub.** If this project sits in a subfolder of a larger repo, note the folder name.
3. **Import the repo in Vercel** at [vercel.com/new](https://vercel.com/new).
   - Framework preset: *Next.js*.
   - If the app is in a subfolder, set **Root Directory** to `ai-pm-assessment`.
4. **Set environment variables** in *Project → Settings → Environment Variables*:
   - `DATABASE_URL`, plus `DIRECT_URL` if you use Supabase
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`: use a hash from `npm run hash-password -- '<strong-password>'`
   - `SESSION_SECRET`: 32+ random characters
5. **Deploy.** Vercel runs `npm run vercel-build`, which:
   1. generates the Prisma client for PostgreSQL
   2. creates or updates the tables (`prisma db push`)
   3. seeds the assessment (idempotent)
   4. runs `next build`
6. **Smoke test.** Open `/`, take the assessment with a test email, then check `/admin`. To remove the test row afterwards, use `npx prisma studio` with `DATABASE_URL` pointed at production, or your database console.

To set up a Postgres database from your own machine instead:

```bash
DATABASE_URL="postgresql://…" DIRECT_URL="postgresql://…" npm run db:deploy
```

---

### Project structure

```
app/
  page.tsx                    student assessment (intro → questions → confirm)
  result/[id]/page.tsx        read-only result page (safe to refresh)
  admin/page.tsx              instructor dashboard (protected)
  admin/login/page.tsx        instructor login
  api/assessment              GET    public questions + shuffled options (no answer key)
  api/submissions             POST   validate + score server-side + persist
  api/submissions/[id]        GET    a submission's score summary
  api/admin/login|logout      POST   session cookie
  api/admin/dashboard         GET    analytics (protected)
  api/admin/export            GET    CSV (protected)
components/                   UI components (student + admin)
lib/                          server logic: db, scoring, auth, analytics, validation, CSV
prisma/                       schema, migrations, seed + answer key (server only)
scripts/                      setup, build, e2e and bundle-leak checks
tests/                        unit tests (Vitest)
types/                        shared public types
```

### Security model

- **The answer key never leaves the server.** `/api/assessment` builds its response from an explicit allow-list: question ID, number, text, type, how many answers to select, and option ID and text. `is_correct` and `points` are never serialised. The client JavaScript contains no questions, options or answer data; `npm run check:bundle` verifies this.
- **Scoring is server-side only.** The browser sends only `questionId` and `selectedOptionIds`. Unknown fields, such as a `score`, are discarded. Every option must belong to its question, and selections may not exceed the allowed count. Multi-select questions are all-or-nothing.
- **Stable option IDs and randomisation.** Options are shuffled with a CSPRNG on every request. Correctness is keyed on opaque option IDs, never on A/B/C/D positions.
- **Duplicates are blocked.** Each attempt carries a client-generated UUID (`submissionId`) that acts as an idempotency key, so double-clicks and retries return the original result. The database also enforces one submission per email per assessment.
- **Students can't see other students' data.** Results are fetched by unguessable submission ID and contain only that student's name and score.
- **Instructor auth.** Credentials come from environment variables, compared in constant time, and the password can be stored as a scrypt hash. Login is rate-limited and the session cookie is HMAC-signed and HttpOnly. Every admin API route and page checks the session on the server.
- **Headers and exports.** Standard security headers are set (`X-Frame-Options: DENY`, `nosniff`, and so on). CSV cells are escaped against spreadsheet formula injection.
