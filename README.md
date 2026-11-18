# ExamCraft AI

Version **3.9-ui-fix** · 18 November 2026

This patch raises the Student Workspace footer, keeps its avatar fully visible,
and lets the menu scroll independently on short screens. The header Back arrow
has been removed; browser Back/Forward still works. The three code files gained
only a few lines overall.

Generate a question paper or timed MCQ test from notes, a syllabus, or both in one upload.
A syllabus sets the topics and level. For example, a unit on stacks can produce a question
asking which value remains after two pushes and a pop. Notes supply the explanations and
examples. A mixed upload uses the syllabus to guide coverage.

Browser Back and Forward move through the pages you visit. The extra header Back arrow
has been removed. Opening a direct page link places Dashboard before it.
Page changes keep the current form, uploaded files and running test in the open tab.

## Generate and save

- **Guest** — Generate, review and export a question paper and answer key. Guest work lives
  in the open tab. Reloading clears it. Sign in from the preview to keep the current paper
  on screen, then choose **Save Paper** to add it to your account.
- **Signed in** — **Save Paper** keeps a copy in **My Papers**. Completing a test records
  its result in **Test History** and **Performance**. Pending saves retry on reconnection.
- Upload up to 8 PDFs or JPG, PNG and WebP images. The combined limit is 3 MiB for hosted
  guests and 50 MiB for signed-in users or local guests. Choose 1–50 questions.

## Generation time and quality

Small, clearly readable text PDFs are sent as page-labelled text. Scans, diagrams and
complex layouts keep their visual content. Small papers use one generation call when
validation passes. Substantial text-only papers with several question types can generate
two groups of sections concurrently. A bounded correction pass replaces missing,
duplicate, invalid or outline-recall questions. Answer guidance now requests 50–80 words
for Short answers and 100–150 for Long answers, with reasoning and an example when useful.
Very Short answers use one or two sentences. These are flexible targets within the existing
generation request. Longer responses can add time depending on the question mix.

The generation status shows elapsed time. The API also returns preparation, AI, validation
and cleanup timings. **30–40 seconds is a target.** Live time varies with the model,
question mix, scans, upload size, queueing and any correction pass.

## Run

1. Install the packages with `py -m pip install -r requirements.txt`.
2. Copy `.env.example` to `.env` for a new setup and set `GEMINI_API_KEY`. Existing
   installations can keep their current environment settings.
3. Run `py app.py` or `START.bat` and open [ExamCraft locally](http://localhost:8000/FINALV2.html).
   On macOS or Linux, use `python3` for the Python commands.

For an existing deployment, replace the package files at the repository root and redeploy.
Check `/api/status` for version `3.9-ui-fix`. The original Supabase setup SQL,
authentication redirect URLs and troubleshooting notes are in [README.txt](README.txt).

| File | Purpose |
| --- | --- |
| `FINALV2.html` | Layout, styles and responsive controls |
| `backend.js` | Browser interactions, login, tests, PDF export and saving |
| `app.py` | Flask routes, source preparation, Gemini calls and validation |

## GitHub, Supabase and Vercel — complete setup

This release uses **Python/Flask**, plain HTML and browser JavaScript. Supabase
stores accounts, papers and attempts; it does not receive the project ZIP.
GitHub holds the source. Vercel runs the website and Python service.

### 1. Prepare the files

1. Download and extract this ZIP. Open the inner `ExamCraft-AI` folder.
2. Keep a backup of your previous ZIP. If updating a GitHub repository, use
   **Code > Download ZIP** there first. Keep your current local `.env` privately.
3. The release contains exactly these nine files:
   `.env.example`, `.gitignore`, `FINALV2.html`, `README.md`, `README.txt`,
   `START.bat`, `app.py`, `backend.js`, `requirements.txt`.
4. Upload these extracted files, not the ZIP. `app.py` and `requirements.txt`
   must be in the same directory. Do not upload a real `.env`, API secrets,
   `.venv`, `node_modules` or `__pycache__`. `.env.example` is a blank template.

### 2. Put the release on GitHub

For your existing repository:

1. In Vercel, open your current project > **Settings > Git**. Note the connected
   repository and the production branch (usually `main`). Open that repository.
2. In GitHub, select that branch and the directory currently used as Vercel's
   Root Directory. If you use the repository root, you should see `app.py` there.
3. Select **Add file > Upload files**. Choose all nine extracted release files.
   Uploading files under the same names replaces those files in the new commit.
4. Enter `Fix sidebar profile visibility and remove header back arrow` as the
   commit message. Commit to the deployment branch if permitted. If a protected
   branch requires a pull request, commit to a new branch, open the PR and merge
   it after review. Vercel deploys the commit on the production branch.
5. Confirm the uploaded `app.py`, HTML and JavaScript are together. Do not leave
   the new app hidden inside an extra folder while Vercel points at the old root.
6. If the repository still has configuration from a different React/Node version,
   do not combine its old routing/build configuration with this Flask release.
   The clean-repository alternative below avoids guessing which old files apply.

Clean-repository alternative:

1. In GitHub, click **+ > New repository**, name it `ExamCraft-AI-3.9`, choose
   the desired visibility, and create it. Do not generate additional starter files.
2. Choose **uploading an existing file**, upload the nine files at the repository
   root and commit. Do not upload the enclosing `ExamCraft-AI` folder.
3. To retain your existing Vercel project and its domain, go to that project's
   **Settings > Git > Connected Git Repository**, disconnect the old repository
   and connect the new one. Grant the Vercel GitHub app access if prompted.
4. Select `main` as the production branch. This changes the source connection;
   it does not migrate or delete a Supabase database.

### 3. Choose the Supabase project

**Recommended for an update: reuse the existing Supabase project.** A code
update does not require deleting its users, papers, database or SMTP settings.

1. Open https://supabase.com/dashboard and select your existing project.
2. If you intentionally want a separate empty database instead, select
   **New project**, choose your organisation, give it a name, set and store the
   database password, select an available nearby region and create the project.
   Wait until it is ready. Keep the previous project until the new connection
   has been checked. Existing users and papers do not transfer automatically.
3. In the chosen project's **Connect** dialog, copy the **Project URL** and
   **publishable API key**. You can also choose the publishable key in
   **Settings > API Keys**. It normally starts with `sb_publishable_`.
4. Use the URL and key from the same project. This application expects the names
   `SUPABASE_URL` and `SUPABASE_PUBLIC_KEY`. Do not put a secret/service-role key
   in `SUPABASE_PUBLIC_KEY`: that value is sent to the browser.

### 4. Create the tables and private upload bucket

1. Open `README.txt` from this ZIP. Find **BEGIN SUPABASE SQL** near the bottom.
2. Copy only the complete SQL from `begin;` through `commit;`, including both.
   Do not copy the explanatory BEGIN/END marker sentences.
3. In the chosen Supabase project, open **SQL Editor**. Use **New query** or
   **+ > Create a new snippet** if that is the label shown. Give it a name such
   as `ExamCraft setup`.
4. Paste the SQL and click **Run**. The script creates the missing tables,
   ownership policies and bucket. It does not contain a table/data deletion.
   It replaces only the named ExamCraft policies and keeps the bucket private.
5. In **Table Editor**, confirm these tables in the `public` schema:

| Table | Required columns |
| --- | --- |
| `examcraft_papers` | `user_id`, `id`, `data`, `deleted`, `created_at` |
| `examcraft_attempts` | `user_id`, `id`, `data`, `created_at` |

6. Both tables use `(user_id, id)` as the primary key, with `user_id` linked to
   `auth.users`. Row Level Security must be enabled. Keep the owner policies
   created by the script; do not use unrestricted public-write policies.
7. Open **Storage** and confirm `examcraft-material` exists and is **private**.
   Its limit is 50 MiB and it allows PDF, JPEG, PNG and WebP.
8. If an existing installation already has this exact schema and policies, you
   may keep them. `CREATE TABLE IF NOT EXISTS` does not repair a differently
   shaped older table. If the SQL reports missing/different columns, compare the
   schema before changing it; do not delete saved data to bypass the error.

### 5. Enable email login and delivery

1. In **Authentication**, open the email sign-in provider configuration
   (under **Sign In / Providers** in the current dashboard).
2. Enable the **Email** provider and allow new user sign-ups. Keep **Confirm
   email** enabled for verified email accounts, then save the settings.
3. This application uses email/password login, confirmation links and password
   reset links. It does not need Supabase anonymous sign-in for guest generation.
4. If your existing custom SMTP already works, retain those settings. For a new
   Supabase project, open **Authentication > Email > SMTP Settings / Custom SMTP**
   and enable the custom SMTP option. Dashboard grouping can vary.
5. From your existing mail provider's SMTP setup, obtain its exact host, port,
   SMTP username and SMTP password. Enter those values in Supabase, set the
   verified sender email and sender name `ExamCraft AI`, then save. For a new
   provider, verify its sending domain/sender first and complete the DNS records
   it supplies. A provider's SMTP password may differ from its account password.
6. Open **Email Templates**. Keep a working confirmation link using
   `{{ .ConfirmationURL }}` in both Confirm Signup and Reset Password templates.
   Do not replace the link with only a numeric token: this UI has no OTP entry form.
7. The built-in Supabase SMTP is restricted to authorised team addresses and
   low send limits. Ordinary students need a working custom SMTP setup. The
   exact host/password depends on your mail provider; it is not a Vercel value.

### 6. Configure Vercel

For your existing deployment, open that project in https://vercel.com/dashboard.
Keep the project if you want to retain its current production domain. If you do
not have a Vercel project, use **Add New > Project**, import the GitHub repository,
and grant repository access when prompted.

1. In **Settings > Build and Deployment**, choose the **Flask** Framework Preset
   if it is not already detected. This ZIP's Python app is exported as `app`
   from `app.py`; `requirements.txt` declares the dependencies.
2. Set Root Directory to the directory containing `app.py`. Use the repository
   root (`./`, the default) if you uploaded the nine files directly there.
   If they are under `ExamCraft-AI/`, select that folder explicitly.
3. Keep Build Command, Install Command and Output Directory at the Flask
   defaults, with old overrides disabled. Do not use an old `npm run build`,
   `dist` output or a Node/React routing configuration for this package.
4. Open **Settings > Environment Variables** and add or edit these exact names:

| Name | Value |
| --- | --- |
| `GEMINI_API_KEY` | Your working Gemini API key |
| `GEMINI_MODEL` | `auto` |
| `SUPABASE_URL` | Project URL from the chosen Supabase project |
| `SUPABASE_PUBLIC_KEY` | Publishable key from that same Supabase project |

5. Select **Production** for every variable. Also select **Preview** if you
   intend to test preview deployments. Save each value without extra quote marks.
   Keep the Gemini key secret. Both Supabase values must be changed together when
   switching projects; Vercel's environment values override the old defaults.
6. You may reuse the working Gemini key already in the existing Vercel project.
   If you need a key, open https://aistudio.google.com/apikey, sign in, select or
   import the appropriate Google Cloud project, create an API key and copy it
   into Vercel's `GEMINI_API_KEY`. Do not put it in GitHub or the browser files.
7. In **Settings > Functions**, keep **Fluid Compute** enabled. Under
   **Advanced Settings > Function Max Duration**, use 300 seconds and save if
   an old lower override exists. This is a timeout ceiling, not the generation
   time. A successful paper returns as soon as it is ready.
8. For a new Vercel project, click **Deploy** after the import configuration is
   complete. For an existing project, deploy the latest production-branch commit.
   If that commit already has a deployment, use **Deployments > latest deployment
   > ... > Redeploy**. If it has never been deployed, use **Create Deployment**
   for the current branch/commit. Redeploying an old commit does not fetch new code.
9. Wait for **Ready**, then copy the production domain from **Settings > Domains**.
   Use the production domain for the following auth URLs. Environment changes
   take effect only in a new deployment, so redeploy after any change.

### 7. Set Supabase authentication URLs

1. Return to the same Supabase project > **Authentication > URL Configuration**.
2. Set **Site URL** to your actual production address, for example
   `https://exam-craft-ai-final.vercel.app` if you retained that domain.
   Replace any old `http://localhost:3000` Site URL.
3. Add each redirect separately, replacing the example domain if yours differs:

```text
https://exam-craft-ai-final.vercel.app/
https://exam-craft-ai-final.vercel.app/FINALV2.html
http://localhost:8000/
http://localhost:8000/FINALV2.html
```

4. Save the URL settings. If you use a custom domain, add its root and
   `/FINALV2.html` URLs too. If testing auth on a preview deployment, allow that
   exact preview URL as well. The app redirects to its current origin and path.
5. After changing these settings, request a fresh confirmation/reset email for
   testing. Already-sent emails can still contain the earlier URL.

### 8. Verify the deployed app

1. Open `https://YOUR_DOMAIN/api/status`. Confirm `version` is `3.9-ui-fix`,
   `configured` is `true`, `upload_mode` is `storage`, and `supabase_url` matches
   the project you selected. `configured` checks that a key is present; a real
   paper generation is still needed to confirm the key/quota works.
2. Open the production site in a fresh private/incognito window. Confirm the
   footer's Student Workspace/S avatar is whole and the extra header arrow is gone.
3. Stay logged out, upload a small PDF (under 3 MiB), request a few questions,
   generate and export both paper and key. Check concept questions and answers.
4. Change a page, use browser Back/Forward, and check that form/upload values
   remain. Guest data is in memory and should clear on a full reload.
5. Create a test account, open the confirmation email, follow its link and log in.
   Confirm the email returns to your production domain. Test Forgot Password too.
6. Generate a paper, press **Save Paper**, open **My Papers**, reload and reopen
   the saved paper. For a guest paper, same-tab sign-in should preserve the preview
   so you can explicitly save it. Download first if leaving the guest tab.
7. Complete a signed-in MCQ test. Check **Test History** and **Performance**.
   Paper saving is explicit; a completed signed-in test records its attempt.
8. In Supabase's Table Editor, confirm corresponding rows were written to
   `examcraft_papers` and `examcraft_attempts` with the signed-in user's ID.
9. Signed-in users can test a file above 3 MiB (up to the combined 50 MiB limit)
   to exercise private storage. Guest hosted requests stay under 3 MiB.
10. Only after these checks, consider retiring an unused old Supabase project.
    Deleting it would remove its users/data and is not part of this code update.

### Troubleshooting

| Symptom | Check |
| --- | --- |
| Old version or arrow still visible | Latest Git commit, correct Vercel Root Directory, production deployment and hard reload (`Ctrl+Shift+R`). |
| `/api/status` is 404 | Flask preset and the directory containing `app.py`; remove conflicting old routing/build configuration. |
| `configured: false` | Exact `GEMINI_API_KEY` spelling, correct deployment environment, save and redeploy. |
| Gemini rejects a request | API key/project access and quota; inspect the displayed error and Vercel Runtime Logs. |
| Authentication connects to the old project | Replace both Supabase environment variables in Production (and Preview if used), then redeploy. |
| Email opens localhost | Production Site URL, allowed redirect URLs and email template; request a fresh email. |
| Email is not sent | Verified custom SMTP sender, provider credentials, sending limits and Auth logs. |
| Papers do not save | User is signed in; press Save Paper; verify exact tables, columns and RLS policies. Use Settings > Retry sync for pending writes. |
| Large upload fails | Sign in, check the private `examcraft-material` bucket and its ownership policies. |
| Function times out | Fluid Compute and max duration, smaller source/count, then Vercel Runtime Logs. |

### Sources checked for these setup instructions

- [GitHub: upload repository files](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)
- [Vercel: Flask deployment](https://vercel.com/docs/frameworks/backend/flask)
- [Vercel: Git settings](https://vercel.com/docs/project-configuration/git-settings)
- [Vercel: environment variables](https://vercel.com/docs/environment-variables)
- [Vercel: function duration](https://vercel.com/docs/functions/configuring-functions/duration)
- [Supabase: API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase: redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase: custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Google: Gemini API keys](https://ai.google.dev/gemini-api/docs/api-key)

UI patch validation: the profile and avatar were visible with at least 42px of
bottom clearance across eight desktop/mobile viewport sizes, including short
landscape screens. Browser Back/Forward, fresh direct links, retained form/upload
values and absence of JavaScript errors were checked locally. This task did not
deploy changes to your live GitHub, Supabase or Vercel accounts.
