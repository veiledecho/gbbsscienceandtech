# STEM OS / LabCore

Next.js 15 App Router platform for a school STEM laboratory. Data is stored in PostgreSQL through Prisma; Auth.js credentials registration assigns the least-privileged `STUDENT` role. Elevated roles must be assigned by an administrator.

## Local setup

1. Install Node.js 20.9 or newer.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`, `DIRECT_URL`, and `AUTH_SECRET`. Use the pooled PostgreSQL URL for `DATABASE_URL` and the direct URL for migrations when using Neon. `prisma.config.ts` loads `.env` for Prisma CLI commands.
3. Set `AUTH_URL=http://localhost:3000`. Add `BLOB_READ_WRITE_TOKEN` for attachments and `GOOGLE_API_KEY` for the architect.
4. Run `npm install`, `npm run db:generate`, `npm run db:migrate`, and `npm run db:seed`.
5. Run `npm run dev`, then register a student account at `/register`.

## Vercel deployment

1. Create a Neon PostgreSQL project and copy its pooled connection string to `DATABASE_URL`. Set `DIRECT_URL` to the direct connection string used by Prisma migrations. Keep both values private.
2. Push this directory to a Git provider and import the repository in Vercel. Select the Next.js framework preset.
3. In Vercel Project Settings → Environment Variables, add `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_URL`, `BLOB_READ_WRITE_TOKEN`, and `GOOGLE_API_KEY`. Generate `AUTH_SECRET` with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`; set `AUTH_URL` to the deployed origin.
4. Create a Vercel Blob store and add its read/write token. Create a Google AI Studio API key and add it as `GOOGLE_API_KEY`.
5. Before the first production deploy, add GitHub repository Actions secrets `NEON_DIRECT_URL` and `NEON_DATABASE_URL`, then run **Actions → Neon database migration → Run workflow**. The workflow applies committed migrations and can optionally seed starter data. You can also run `npm run db:deploy` from another trusted runner with outbound PostgreSQL TCP access.
6. Deploy. Verify registration, login, inventory checkout/return, attendance export, Blob uploads, search, and AI generation with each required environment variable configured.
7. Promote executive, faculty, and admin roles through a controlled database operation. Self-registration always creates a student.

This project uses Prisma's Neon serverless adapter. To use Supabase instead, replace `@prisma/adapter-neon` with `@prisma/adapter-pg` and configure its PostgreSQL pool; keep `DIRECT_URL` pointed at the direct migration connection. Do not expose server secrets through `NEXT_PUBLIC_*` variables.

If the application adapter can reach Neon but `prisma migrate` returns `P1001`, the current network may permit Neon HTTP/WebSocket traffic but block Prisma Migrate's native PostgreSQL TCP connection on port 5432. Use the manual GitHub Actions migration workflow above; don't run schema changes automatically on every Vercel preview build.

## Operational notes

- Proposal attachments use public Vercel Blob URLs because the prototype's dossiers are shareable lab documents. Do not upload student records or sensitive documents. For private files, switch the Blob flow to private storage with authenticated download handlers.
- Server Action multipart uploads are capped at 3.5 MB total to fit Vercel request limits. Larger files should use Vercel Blob's client-upload token flow.
- Firmware files are saved per proposal through `FirmwareFile`; unsaved edits remain in the current browser session. The serial monitor and compile control are intentionally simulations, not hardware access.
- The schema includes Auth.js adapter models. Credentials use JWT sessions; OAuth providers can be added later without changing the user relation model.