EXAMCRAFT AI — SAME-FILE EDITION — 4 NOVEMBER 2026
Version: 3.4-auto-syllabus

1. WHAT CHANGED

Upload notes, a syllabus photo/PDF, or both in the SAME existing upload box.
There is no separate Notes/Syllabus switch. The AI reads the visible material,
including scanned PDFs, in the normal generation request. Notes stay grounded
in their content; syllabus questions use established knowledge within its topics.
Syllabus answers identify that they use subject knowledge. Requested question
counts and answer limits still apply; unreadable material reports an error.

The interface, animations, login, signup/reset, topic practice, MCQ timer,
question types/counts, preview, review, performance and PDF export are retained.
Save Paper works on the generated-paper preview, live MCQ test and result/review
screen. It stores a snapshot in My Papers; opening/exporting it needs no new AI
request. Saving during a test neither submits it nor resets its timer. Repeated
saves of the same paper/test do not add duplicate entries.

Performance is calculated from saved completed tests, not from saved papers.
Each completed test has its own record. A paper-sync error no longer blocks
score saving, and a score-sync error no longer blocks My Papers. Pending saves
survive reload/login through an account-specific browser outbox, even if the
secondary cache write fails. Sync errors now distinguish schema and permission
problems. Sign in BEFORE starting a test for account/cloud history; guest
practice remains on that browser/device.

Code cleanup reuses the existing DOM helper for 110 lookups and shares the
countdown between topic and AI tests. No extra project files were added.

2. CODE UPDATE AND SUPABASE SETUP ARE BOTH NEEDED

Fresh read-only checks on 4 November 2026, using this project's public API key:
- test_attempts and question_papers respond to zero-row requests (HTTP 200).
- examcraft_attempts and examcraft_papers return PGRST205 (missing from the API
  schema cache). These are the tables the updated persistence code uses.
- Full schema metadata could not be retrieved without further authentication.
  No rows were read; authenticated write/RLS behavior has not been verified.

A similarly named table is not automatically compatible: columns, key types and
policies must match. This package deliberately does not rename, delete, migrate
or overwrite test_attempts/question_papers. It uses its own snapshot tables.
Existing rows in those older tables are NOT automatically imported because their
schema is unverified. Existing account-specific browser history is retained and
queued for sync; use the same browser and site origin before clearing its data.

To activate this version:
1) Replace the matching nine files at your repository root with this package.
   Keep your server-side GEMINI_API_KEY and existing local .env. Redeploy/restart.
   If you already use the 28 October same-file edition, only app.py, backend.js,
   README.md and README.txt changed in this update.
2) In the SAME Supabase project, open SQL Editor -> New query. Copy the complete
   block below from begin; through commit; and run it once. It creates the two
   missing snapshot tables, per-user policies and the private temporary upload
   bucket. It does not delete or alter your older test_attempts/question_papers.
3) Sign in to the updated site. Open Settings -> Retry sync. Complete a test,
   save a paper, reload and check Performance, Test History and My Papers.

Table mapping for this package:
  Completed tests / Performance -> public.examcraft_attempts
  Save Paper / My Papers        -> public.examcraft_papers
  Large temporary source files  -> private bucket examcraft-material

The schema uses (user_id,id) as its key, a JSON snapshot in data and created_at;
papers also have a deleted marker so stale devices cannot restore removed papers.
RLS restricts each account to its own rows. Keep RLS enabled. The browser uses
the user's session and the publishable key, never a service-role key.
The SQL is re-runnable for this snapshot schema. CREATE TABLE IF NOT EXISTS does
not migrate an existing incompatible table of the same name; inspect it first.
This task did not change your live database, push GitHub or redeploy Vercel.

3. RUNNING AND DEPLOYMENT

Same nine files:
  FINALV2.html, backend.js, app.py, requirements.txt, START.bat,
  .env.example, .gitignore, README.md, README.txt.

Windows:
  py -m pip install -r requirements.txt
  py app.py
Or run the existing START.bat. On macOS/Linux use python3 instead of py.
Open http://localhost:8000/FINALV2.html, not the HTML file directly.
Set GEMINI_API_KEY in the server environment or local .env; use GEMINI_MODEL=auto.
Never put the Gemini key into browser JavaScript or commit .env.

Vercel: keep these files at the root, select the Flask preset, remove old static
build/output overrides, and keep the server environment variables. No npm build
or additional routing file is needed. /api/status should show 3.4-auto-syllabus.
Generation uses a 255-second backend budget; ensure the hosting function duration
can accommodate this within the limits of your plan. A live deployment/build was
not performed in this task.

Supabase Authentication -> URL Configuration:
  Site URL: https://exam-craft-ai-eight.vercel.app
  Redirect URLs for the paths you use:
    https://exam-craft-ai-eight.vercel.app/
    https://exam-craft-ai-eight.vercel.app/FINALV2.html
    http://localhost:8000/FINALV2.html
Add the exact URL of any other preview/custom domain you use.

4. EDIT MAP AND PRESERVED LIMITS

FINALV2.html: page layout, CSS and animations; unchanged from the previous package.
backend.js: browser interaction, uploads, quiz, login, saving and PDF printing.
  byId / startTestTimer: shared DOM lookup and quiz countdown.
  EDIT J7 / addMaterial / requestQuestions: one combined PDF/image upload path.
  generatePaper / startTest: paper and timed AI test generation.
  EDIT J8 / ExamStore: cache, outbox, independent table sync, per-account records.
  saveCurrentPaper / saveTestPaper: explicit snapshots for My Papers.
app.py: Python/Flask server, Gemini prompts, upload validation and output checks.
  EDIT 1 / ANSWER_LENGTHS: Very Short 20–30; Short 40–50; Long 100–180 words.
  EDIT 5 / SYSTEM_INSTRUCTION: automatic notes/syllabus/mixed content rules.
  repair_answer_lengths: correct only failing answers; preserve valid answers.
  SECTION 6 / generate: files -> one AI generation -> validation/repair -> output.
  SECTION 7: HTTP endpoints and authenticated generation.

Uploads: up to 8 PDF/JPG/PNG/WebP files together, 50 MB combined, up to 1000 PDF
pages and 40 megapixels per image. Up to 50 AI questions per request. No file is
silently discarded. Small combined inputs up to 4 MiB inline PDFs including scans;
larger PDFs retain the existing Gemini Files API path. Two independent answer
repair batches may overlap; no word limits/counts have been reduced. Backend
stage timings are returned in timings_ms. Actual AI latency/quality is unmeasured
here; 15–20 seconds is not a guarantee.

On Vercel, selections above 2.5 MiB upload to private Supabase Storage first,
then only object paths go through the server. The server verifies ownership.
Temporary uploads are removed when cleanup succeeds; network/tab interruption
can leave temporary files. Saved papers store their full content, not those
source uploads or a binary PDF. My Papers can export the same content again.

5. VERIFICATION AND TROUBLESHOOTING

Current checks use simulated external services, not your signed-in live account.
- 33 existing Python regression checks pass: counts, answer lengths/repair,
  mixed/scanned PDFs, upload cleanup, deadlines, fallback, auth and routes.
- 12 persistence/timer checks pass: individual scores, duplicate Save Paper,
  reload/login, independent failures, retry, pagination, account isolation,
  second-device merge, tombstones, outbox recovery and MCQ saving during a test.
- 2 upload integration checks pass: photos/scans/mixed inputs use the same
  endpoint without a mode selector or extra classification request; unreadable
  material returns an error rather than a fabricated paper.
- JavaScript syntax and Python compilation pass. HTML/CSS are byte-for-byte
  unchanged from the 28 October same-file package. No browser screenshot or live
  Gemini generation/database write was used to claim an end-to-end live result.

If Settings reports a table/column problem: apply/check section 2 and the SQL.
Permission denied: check authenticated grants and own-row RLS policies.
Cloud failure/offline: keep pending records on this device; use Retry sync.
Local storage full: keep the tab open until cloud sync succeeds.
Missing key: set the server-side GEMINI_API_KEY, then redeploy/restart.
413/504: use the updated upload path; check hosting setup or reduce input size.
429: respect provider quota; retry later. Model issues: keep GEMINI_MODEL=auto.
Export popup blocked: allow the popup, then Print / Save as PDF.

Supabase policy/upsert references checked on 4 November 2026:
https://supabase.com/docs/guides/database/postgres/row-level-security
https://supabase.com/docs/reference/javascript/upsert

BEGIN SUPABASE SQL — COPY FROM begin; THROUGH commit;
begin;

create table if not exists public.examcraft_attempts (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 100),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
create table if not exists public.examcraft_papers (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 100),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists examcraft_attempts_owner_date on public.examcraft_attempts(user_id, created_at desc);
create index if not exists examcraft_papers_owner_date on public.examcraft_papers(user_id, created_at desc);
alter table public.examcraft_attempts enable row level security;
alter table public.examcraft_papers enable row level security;
revoke all on public.examcraft_attempts, public.examcraft_papers from anon, authenticated;
grant select, insert on public.examcraft_attempts to authenticated;
grant select, insert, update on public.examcraft_papers to authenticated;

drop policy if exists "examcraft_attempts_read_own" on public.examcraft_attempts;
create policy "examcraft_attempts_read_own" on public.examcraft_attempts for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "examcraft_attempts_insert_own" on public.examcraft_attempts;
create policy "examcraft_attempts_insert_own" on public.examcraft_attempts for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "examcraft_papers_read_own" on public.examcraft_papers;
create policy "examcraft_papers_read_own" on public.examcraft_papers for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "examcraft_papers_insert_own" on public.examcraft_papers;
create policy "examcraft_papers_insert_own" on public.examcraft_papers for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "examcraft_papers_update_own" on public.examcraft_papers;
create policy "examcraft_papers_update_own" on public.examcraft_papers for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Temporary material uploads bypass the hosting function's request-body cap.
-- Not a public bucket. Each user's first folder is their authenticated UUID.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('examcraft-material', 'examcraft-material', false, 52428800,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "examcraft_material_insert_own" on storage.objects;
create policy "examcraft_material_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'examcraft-material' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "examcraft_material_read_own" on storage.objects;
create policy "examcraft_material_read_own" on storage.objects for select to authenticated
  using (bucket_id = 'examcraft-material' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "examcraft_material_delete_own" on storage.objects;
create policy "examcraft_material_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'examcraft-material' and (storage.foldername(name))[1] = (select auth.uid())::text);

commit;

END SUPABASE SQL
