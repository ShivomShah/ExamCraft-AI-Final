# ExamCraft-AI

Generate exam papers and online MCQ tests from notes, a syllabus, or both.
Use the **same upload box** for all of them; no separate Notes/Syllabus option.
Readable syllabus photos and scanned PDFs are handled in the normal AI request.

The project keeps the **same nine filenames as the original GitHub repository**.
There are only **three code files** to understand:

| File | What to edit |
| --- | --- |
| `FINALV2.html` | Page layout, text, CSS colours and animations. Search `EDIT H1`, `EDIT H2` or `EDIT PAGE`. |
| `backend.js` | Browser interaction, login, test scoring, saved history and PDF export. Search `EDIT J1` through `EDIT J8`. |
| `app.py` | Python server, Gemini requests, notes/syllabus instructions and answer lengths. Search `EDIT 1`, `EDIT 5` or `SECTION 7`. |

Very Short answers: **20–30 words**. Short: **40–50 words**. Long: **100–180 words**.
Python validates these lengths and repairs only failing answers in small batches.
Repairs use word arrays with constrained lengths, then Python checks the joined
answer again. Question counts and already-valid answers are preserved.

Generation skips separate Gemini PDF uploads for combined inputs up to 4 MiB.
Two independent answer-repair batches can run together; large-PDF support and
word limits are unchanged. `/api/generate` returns backend stage timings.
Actual AI speed is not benchmarked here. `/api/status` should show
`3.4-auto-syllabus` after restarting/redeploying this version.

Signed-in test results are saved individually in Test History. Select **Save Paper**
on a generated-paper preview, during an online MCQ test, or on its result/review
screen to keep those questions and answers in **My Papers**. Reopen/export them
without AI regeneration; saving during a test does not submit it or reset its timer.
Completed tests save automatically to Test History/Performance. Paper and score
sync run independently, so a failing table cannot block the other. Pending saves
survive reload/login in an account-specific outbox and retry when you reconnect.

**Supabase setup is required:** a read-only check on 4 November found
`test_attempts` / `question_papers`, but this package's `examcraft_attempts` /
`examcraft_papers` returned `PGRST205`. In Supabase SQL Editor, run the complete
SQL block in [README.txt](README.txt), then choose **Settings → Retry sync**.
The SQL leaves your older tables untouched; their rows are not automatically
migrated because their schema is unverified. Existing browser history is retained.

See the existing [README.txt](README.txt) for setup, the required Supabase SQL,
Vercel settings, the viva edit map and what was checked. No separate SQL, test,
CSS, guide or deployment-config files are included.

Locally: install `requirements.txt`, set `GEMINI_API_KEY`, then run `py app.py`
(or use the existing `START.bat`). Open `http://localhost:8000/FINALV2.html`.

This package retains the previous fixes and the same HTML/CSS. DOM lookups and
quiz countdown code are shared to remove repetition. Replace the nine matching
repository files; from the 28 October same-file edition only `app.py`, `backend.js`
and the two READMEs changed. The live site and database have not been modified.
Validation uses simulated services; real Gemini generation and authenticated
cloud saving still need to be checked after deployment/database setup.
