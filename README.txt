EXAMCRAFT AI
Version 3.9-ui-fix · 18 November 2026

UI patch: Student Workspace is raised, its avatar stays visible and the menu
scrolls separately on short screens. The extra header Back arrow is removed.
Full GitHub > Supabase > Vercel setup instructions are in README.md.

1. GENERATING FROM STUDY MATERIAL

Use the same upload box for a syllabus, notes or both. A syllabus supplies the
scope for conceptual questions, predictions, comparisons and worked problems.
For notes, questions use the supplied content. Mixed uploads use relevant notes
for detail and the syllabus for topic coverage. Each answer includes a short
source reference. S1 means the first selected file, S2 the second, and so on.

Choose 1–50 questions across MCQ, True / False, Very Short, Short and Long.
Set a section count to zero to skip it. Very Short answers use one or two useful
sentences. Short answers usually target 50–80 words and Long answers 100–150 words,
including reasoning and a relevant example or worked application. Targets are
flexible. The existing request produces the expanded answers. Word counts do not
trigger correction calls. Preview and export each document with Print / Save as PDF.

Browser Back/Forward moves one visited page at a time. The extra header Back arrow
has been removed. A fresh direct page link gets a Dashboard entry before
it. Reload preserves the route history. In-tab navigation keeps your form inputs,
uploads and running test. Login and recovery redirects update the current entry.

Question counts show which sections are included. Buttons, preview tabs and file
cards give hover, focus and press feedback. Settings and the device reduced-motion
preference control animation.

The server recognises some outline-recall stems in English, Hindi and Spanish.
It also checks choices, duplicate stems, source numbers and question counts.
One correction pass can replace rejected or missing items. The app returns a
complete validated paper or an error with the current settings available to edit.

2. SPEED AND UPLOADS

The fast path sends compact, page-labelled text for clearly readable simple
PDFs. Every page must qualify. Scans, tables, figures and uncertain extractions
retain the original PDF. Clear small images keep their original encoding.
When combined binary material exceeds the inline budget, the server sends
the largest files through the Files API and cleans up temporary files.

A small paper usually needs one successful model generation. For a text-only
paper of 12 or more questions, the server can overlap two groups of complete
sections when both groups contain enough work and a worker is available.
All groups receive every source. They are validated together before display.

The interface shows elapsed time. The response contains timings_ms for prepare,
ai, validation, cleanup and total. The 30–40 second target depends on actual
Gemini service time, output length, network conditions and uploaded material.
Expanded answers can increase generation time. This update has been checked with
local test responses, so the additional live response time is unmeasured.

Upload up to 8 files and 50 MiB combined. Hosted guests have a 3 MiB combined
limit. Signed-in hosted uploads above 3 MiB use private Supabase Storage.
Local guests can use the full 50 MiB. The maximum is 1000 PDF pages combined
and 40 megapixels per image. Supported formats are PDF, JPG, PNG and WebP.

3. ACCOUNT AND SAVING

Guests can generate papers and take tests. Guest previews and results live in
memory until the page reloads or closes. From a guest paper preview, Sign in to
save returns to that paper after same-tab login. Choose Save Paper to keep it.
A signup requiring email confirmation can take you to another tab, so download
a guest paper before leaving. Guest test history stays out of the account.

Signed-in users can save papers from the preview or from a running/completed MCQ
test. My Papers stores question and answer snapshots. Saving a running test keeps
its timer going. Test completion records the attempt separately for History and
Performance. Pending account saves survive reload and retry. Settings shows sync
status. Keep pending data on the same browser/site until sync completes.

Account papers        public.examcraft_papers
Completed attempts    public.examcraft_attempts
Temporary uploads     private bucket examcraft-material

4. INSTALL OR UPDATE

On Windows, keep your existing .env or copy .env.example to .env and enter your
server-side GEMINI_API_KEY. Keep GEMINI_MODEL=auto to choose an available Flash
model. Install and run with the following commands, or double-click START.bat.

  py -m pip install -r requirements.txt
  py app.py

On macOS/Linux, use python3. Open http://localhost:8000/FINALV2.html.

For an existing Vercel project, put the package contents at the repository root,
keep the existing environment settings and redeploy. Open /api/status and check
for 3.9-ui-fix. Existing snapshot tables and the private upload bucket
support this update. An installation that already has them can skip the SQL.

For a new Supabase project, set SUPABASE_URL and SUPABASE_PUBLIC_KEY together.
Enable email authentication and configure the Site URL / Redirect URLs in
Authentication > URL Configuration. Use your actual production and local URLs.

  Site URL      https://exam-craft-ai-final.vercel.app
  Redirects     https://exam-craft-ai-final.vercel.app/
                https://exam-craft-ai-final.vercel.app/FINALV2.html
                http://localhost:8000/FINALV2.html

Run the SQL below once in SQL Editor > New query when setting up a new project.
Use the session with the public key in the browser. Keep row-level security on.

5. CHECKS AND TROUBLESHOOTING

Local checks cover syllabus, notes, mixed sources, scan/diagram preservation,
targeted correction, exact counts, simultaneous sections and upload limits.
Browser checks exercise guest reload, both printed PDFs, same-tab sign-in,
explicit saves, private uploads, saved history, retry and mobile navigation.
Back/Forward checks include direct links, reload, active tests, generated previews,
rapid transitions, unchanged generation counts and small-screen header layout.
The Supabase browser SDK used local test endpoints. The SQL was exercised on
a local PostgreSQL engine with test accounts. Live Gemini latency, email delivery
and the production Supabase account require the deployed services.

If saving is pending, open Settings and choose Retry sync. For a quota error,
check the Gemini project quota. For a large or timed-out generation, try fewer
questions or a smaller document. Allow the print window when exporting a PDF.

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
