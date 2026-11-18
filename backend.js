/* EXAMCRAFT — BROWSER LOGIC (JavaScript)
 * This file runs in the browser; app.py is the actual Python backend.
 * ONLY THREE CODE FILES: HTML = appearance, this file = interaction, Python = AI.
 *
 * VIVA EDIT MAP — search these markers with Ctrl+F:
 *   J1 Navigation / search / popups        J2 Question count controls
 *   J3 Built-in questions / test scoring  J4 Saved-paper preview and PDF
 *   J5 Dashboard / performance            J6 Login / signup / profile
 *   J7 Uploads / AI requests / answers    J8 Cloud history / Save Paper
 *
 * For answer style, edit SYSTEM_INSTRUCTION in app.py; no fixed word limits.
 * Setup commands, Supabase SQL and bug-check results are in existing README.txt.
 */
// EDIT J1 — NAVIGATION, TOASTS AND CHART DRAWING
const pageNames = {
    dashboard: 'Dashboard',
    create: 'Create Paper',
    test: 'Online Test',
    papers: 'My Papers',
    performance: 'Performance',
    settings: 'Settings',
};
function motionEnabled() {
    return !document.body.classList.contains('no-animations') &&
        !matchMedia('(prefers-reduced-motion: reduce)').matches;
}
async function navigate(page, historyMode = 'push') {
    if (!Object.hasOwn(pageNames, page)) return;
    const token = ++navigationVersion;
    navigationPage = page;
    if (navigationReady && historyMode === 'replace') {
        history.replaceState({ ...history.state, examcraftPage: page }, '', '#' + page);
    } else if (navigationReady && historyMode === 'push' && location.hash !== '#' + page) {
        history.pushState({ examcraftPage: page, examcraftBack: true }, '', '#' + page);
    }
    const previous = document.querySelector('.page.active');
    if (previous?.id !== 'page-' + page) {
        closeAuthDialog?.();
        byId('modalCancel')?.click();
        if (previous && motionEnabled()) {
            previous.classList.add('leaving');
            await new Promise((resolve) => setTimeout(resolve, 160));
        }
        if (token !== navigationVersion) return;
        document
            .querySelectorAll('.page')
            .forEach((el) => el.classList.remove('active', 'leaving'));
        const target = byId('page-' + page);
        target.classList.add('active');
        target.style.animation = 'none';
        void target.offsetWidth;
        target.style.animation = '';
        window.scrollTo({ top: 0, behavior: 'instant' });
    } else {
        previous.classList.remove('leaving'); // Cancelled transition must stay visible.
    }
    closeMenu();
    byId('breadcrumb').textContent = pageNames[page];
    document.querySelectorAll('[data-page]').forEach((button) => {
        const selected = button.dataset.page === page;
        button.classList.toggle('active', selected);
        if (selected) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
    });
    byId('searchResults')?.remove();
    if (page === 'papers') renderPapers();
    if (page === 'history') renderHistory();
    if (page === 'preview') {
        showFullPreview(viewingAnswers);
        renderPapers();
    }
    if (page === 'performance') renderPerformance();
    refreshDashboard();
    const heading = document.querySelector('#page-' + page + ' h1');
    if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
    }
}
function initializeNavigation() {
    navigationReady = true;
    history.scrollRestoration = 'manual';
    const route = location.hash.slice(1);
    const page = Object.hasOwn(pageNames, route) ? route : navigationPage;
    if (!history.state?.examcraftPage) {
        history.replaceState({ examcraftPage: 'dashboard', examcraftBack: false }, '', '#dashboard');
        void navigate(page);
    } else {
        void navigate(page, 'replace');
    }
}
function restoreNavigation() {
    if (!navigationReady) return;
    const route = location.hash.slice(1);
    const page = Object.hasOwn(pageNames, route) ? route : 'dashboard';
    if (history.state?.examcraftPage !== page) {
        history.replaceState({ examcraftPage: page, examcraftBack: true }, '', '#' + page);
    }
    if (navigationPage !== page) void navigate(page, 'traverse');
}
window.addEventListener('popstate', restoreNavigation);
window.addEventListener('hashchange', restoreNavigation);
document
    .querySelectorAll('[data-page]')
    .forEach((b) => (b.onclick = () => navigate(b.dataset.page)));
let toastTimeout;
function toast(message) {
    const t = byId('toast');
    t.textContent = message;
    t.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => t.classList.remove('show'), 3200);
}
function makeChart(id, data) {
    const el = byId(id);
    if (!el) return;
    const w = 660,
        h = 240,
        left = 38,
        top = 18,
        right = 12,
        bottom = 22,
        innerW = w - left - right,
        innerH = h - top - bottom;
    const x = (i) => left + (data.length === 1 ? innerW / 2 : (i * innerW) / (data.length - 1)),
        y = (v) => top + ((100 - v) * innerH) / 100;
    const pts = data.map((v, i) => `${x(i)},${y(v)}`).join(' ');
    const area = `${left},${h - bottom} ${pts} ${x(data.length - 1)},${h - bottom}`;
    let grid = '';
    for (let n = 0; n <= 100; n += 25) {
        grid += `<line x1="${left}" y1="${y(n)}" x2="${w - right}" y2="${y(n)}" stroke="#eeedf7" stroke-dasharray="4 5"/><text x="${left - 12}" y="${y(n) + 4}" font-size="11" fill="#626780" text-anchor="end">${n}</text>`;
    }
    el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Performance score line chart"><defs><linearGradient id="shade-${id}" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#9578f7" stop-opacity=".22"/><stop offset="1" stop-color="#9578f7" stop-opacity="0"/></linearGradient></defs>${grid}<polygon points="${area}" fill="url(#shade-${id})"/><polyline points="${pts}" fill="none" stroke="#8163f2" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:1500;stroke-dashoffset:1500;animation:drawLine 1.5s ease forwards"/>${data.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="5" fill="white" stroke="#8163f2" stroke-width="3"><title>Score: ${v}%</title></circle>`).join('')}</svg>`;
}

// EDIT J2 — QUESTION COUNTS (Python validates the same types)
const questionTypes = [
    ['MCQ', 'Multiple Choice Questions'],
    ['True / False', 'True / False'],
    ['Very Short', 'Very Short Answer'],
    ['Short', 'Short Answer'],
    ['Long', 'Long Answer'],
];
const defaults = [0, 0, 0, 0, 0];
byId('counters').innerHTML = questionTypes
    .map(
        ([key, label], i) =>
            `<div class="counter-row"><strong>${label}</strong><input class="input count" type="number" min="0" max="50" value="${defaults[i]}" data-type="${key}" oninput="updatePreview()"></div>`,
    )
    .join('');
function getCounts() {
    return [...document.querySelectorAll('.count')].map((x) =>
        Math.max(0, Math.min(50, parseInt(x.value) || 0)),
    );
}
function escapeHtml(s) {
    return String(s).replace(
        /[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
}
// EDIT J3 — BUILT-IN TOPIC PRACTICE AND TEST SCORING
const quizBank = [
    {
        q: 'Which data structure follows FIFO?',
        o: ['Stack', 'Queue', 'Tree', 'Graph'],
        a: 1,
    },
    {
        q: 'Which operation inserts an item into a stack?',
        o: ['Pop', 'Push', 'Peek', 'Dequeue'],
        a: 1,
    },
    {
        q: 'What is the time complexity of binary search on a sorted array?',
        o: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],
        a: 1,
    },
    {
        q: 'Which structure is commonly used for function calls?',
        o: ['Queue', 'Heap', 'Stack', 'Graph'],
        a: 2,
    },
    {
        q: 'What is the first index of a typical zero-indexed array?',
        o: ['0', '1', '-1', '2'],
        a: 0,
    },
    {
        q: 'Which traversal visits the root before its subtrees?',
        o: ['Inorder', 'Postorder', 'Preorder', 'Level order only'],
        a: 2,
    },
    {
        q: 'Which structure consists of nodes and edges?',
        o: ['Array', 'Graph', 'Stack', 'Queue'],
        a: 1,
    },
    {
        q: 'What does LIFO stand for?',
        o: [
            'Last In First Out',
            'Least In First Out',
            'Last In Final Order',
            'Linked Index First Out',
        ],
        a: 0,
    },
    {
        q: 'What is the worst-case lookup time in an unsorted array?',
        o: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
        a: 2,
    },
    {
        q: 'Which data structure is ideal for BFS?',
        o: ['Stack', 'Queue', 'Heap', 'Tree'],
        a: 1,
    },
];
let testQuestions = [],
    answers = [],
    current = 0,
    remaining = 0,
    timerInterval = null,
    testRunning = false,
    currentTestMeta = null;
// VIVA: one ID at START lets Save Paper work during/after a test without duplicates.
function rememberTestDetails(materialKind = null) {
    currentTestMeta = {
        id: crypto.randomUUID(),
        startedAt: new Date().toISOString(),
        subject: runningQuizLabel,
        source: runningQuizSource,
        duration: remaining / 60,
        filename:
            runningQuizSource === 'ai'
                ? materialFiles.quiz.map((file) => file.name).join(', ')
                : 'Topic practice',
        materialKind,
    };
    reviewData = null;
}
function updateTimer() {
    let m = Math.floor(Math.max(0, remaining) / 60),
        s = Math.max(0, remaining) % 60;
    byId('timer').textContent =
        `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
// Topic practice and uploaded-material tests share the same countdown.
function startTestTimer() {
    const deadline = Date.now() + remaining * 1000;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        updateTimer();
        if (remaining === 0) submitTest(true);
    }, 250);
}
function renderQuestion() {
    let q = testQuestions[current];
    byId('testPosition').textContent =
        `Question ${current + 1} of ${testQuestions.length}`;
    byId('testProgress').style.width =
        `${((current + 1) / testQuestions.length) * 100}%`;
    byId('questionText').textContent = q.q;
    byId('nextButton').textContent =
        current === testQuestions.length - 1 ? 'Finish & Analyze →' : 'Next →';
    const opts = byId('testOptions');
    opts.innerHTML = testQuestions[current].o
        .map(
            (o, i) =>
                `<button class="test-option ${answers[current] === i ? 'selected' : ''}" role="radio" aria-checked="${answers[current] === i}" onclick="selectAnswer(${i})"><span class="option-letter">${String.fromCharCode(65 + i)}</span>${escapeHtml(o)}</button>`,
        )
        .join('');
    byId('previousButton').disabled = current === 0;
    byId('questionMap').innerHTML = testQuestions
        .map(
            (q, i) =>
                `<button class="${answers[i] !== null ? 'answered' : ''} ${i === current ? 'current' : ''}" aria-label="Question ${i + 1}${answers[i] !== null ? ', answered' : ', unanswered'}" aria-current="${i === current ? 'step' : 'false'}" onclick="current=${i};renderQuestion()">${i + 1}</button>`,
        )
        .join('');
}
function selectAnswer(i) {
    answers[current] = i;
    renderQuestion();
}
function submitTest(auto = false) {
    if (!testRunning) return;
    testRunning = false;
    clearInterval(timerInterval);
    byId('testLive').classList.add('hidden');
    byId('testResults').classList.remove('hidden');
    let correct = answers.filter((a, i) => a === testQuestions[i].a).length,
        skipped = answers.filter((a) => a === null).length,
        wrong = answers.length - correct - skipped;
    byId('resScore').textContent = `${correct}/${answers.length}`;
    byId('resCorrect').textContent = correct;
    byId('resWrong').textContent = wrong;
    byId('resSkip').textContent = skipped;
    toast(auto ? 'Time is up — test submitted.' : 'Test submitted! Review your answers below.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    reviewData = {
        ...currentTestMeta,
        date: new Date().toISOString(),
        questions: structuredClone(testQuestions),
        answers: [...answers],
        seconds: Math.max(
            0,
            Math.round((Date.now() - (window.testStartedAt || Date.now())) / 1000),
        ),
    };
    if (authUser) attempts.unshift(reviewData);
    // Every completed test gets its own stable ID and durable outbox entry.
    ExamStore.saveAttempt(reviewData);
    filterReview('all');
    renderHistory();
}
function resetTest() {
    clearInterval(timerInterval);
    testRunning = false;
    currentTestMeta = null;
    reviewData = null;
    byId('testSetup').classList.remove('hidden');
    byId('testResults').classList.add('hidden');
    byId('testLive').classList.add('hidden');
}
function toggleAnimations() {
    const off = document.body.classList.toggle('no-animations');
    const toggle = byId('animationToggle');
    toggle.classList.toggle('on', !off);
    toggle.setAttribute('aria-checked', String(!off));
    toast(off ? 'Animations disabled' : 'Animations enabled');
}
// 4. WORKSPACE STATE, TEST REVIEW AND SCORING
Object.assign(pageNames, {
    preview: 'Paper Preview',
    history: 'Test History',
    help: 'Help & Guide',
});
let activePaper = null,
    reviewData = null,
    navigationVersion = 0,
    navigationReady = false,
    navigationPage = 'dashboard',
    viewingAnswers = false;
function readLocal(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
        return [];
    }
}
let savedPapers = [],
    attempts = [];
function closeMenu() {
    byId('sidebar').classList.remove('open');
    byId('mobileShade').classList.remove('show');
}
document.querySelector('.mobile-menu').onclick = () => {
    byId('sidebar').classList.toggle('open');
    byId('mobileShade').classList.toggle('show');
};
function searchPages(q) {
    byId('searchResults')?.remove();
    if (!q.trim()) return;
    const panel = document.createElement('div');
    panel.id = 'searchResults';
    panel.className = 'search-results';
    const matches = Object.keys(pageNames).filter((k) =>
        pageNames[k].toLowerCase().includes(q.toLowerCase()),
    );
    panel.innerHTML = matches.length
        ? matches
              .map((k) => `<button onclick="navigate('${k}')">${pageNames[k]} →</button>`)
              .join('')
        : '<p style="padding:12px">No matching pages.</p>';
    document.querySelector('.topbar').append(panel);
}
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search,.search-results'))
        byId('searchResults')?.remove();
    const b = e.target.closest('.btn,.pill,.round');
    if (!b || b.disabled || !motionEnabled()) return;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const box = b.getBoundingClientRect();
    ripple.style.left = (e.detail ? e.clientX - box.left : box.width / 2) + 'px';
    ripple.style.top = (e.detail ? e.clientY - box.top : box.height / 2) + 'px';
    b.append(ripple);
    setTimeout(() => ripple.remove(), 650);
});
function modal(title, description, action, label = 'Continue') {
    const root = byId('modalRoot');
    root.innerHTML = `<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><h2 id="modalTitle">${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p><div class="flex" style="justify-content:flex-end"><button class="btn outline" id="modalCancel">Cancel</button><button class="btn primary" id="modalConfirm">${escapeHtml(label)}</button></div></div></div>`;
    const prior = document.activeElement;
    const close = () => {
        root.innerHTML = '';
        document.removeEventListener('keydown', trap);
        prior?.focus();
    };
    const trap = (e) => {
        if (e.key === 'Escape') close();
        if (e.key === 'Tab') {
            const buttons = [...root.querySelectorAll('button')];
            if (e.shiftKey && document.activeElement === buttons[0]) {
                e.preventDefault();
                buttons[1].focus();
            } else if (!e.shiftKey && document.activeElement === buttons[1]) {
                e.preventDefault();
                buttons[0].focus();
            }
        }
    };
    document.addEventListener('keydown', trap);
    byId('modalCancel').onclick = close;
    byId('modalConfirm').onclick = () => {
        close();
        action();
    };
    byId('modalCancel').focus();
}
byId('upload').tabIndex = 0;
byId('upload').setAttribute('role', 'button');
byId('upload').onkeydown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        byId('pdfFile').click();
    }
};
const topicPracticeLimit = 10;
byId('mcqCount').max = topicPracticeLimit;

function startTopicPractice() {
    const n = Number(byId('mcqCount').value),
        per = Number(byId('timePerQuestion').value);
    if (!Number.isInteger(n) || n < 1 || n > topicPracticeLimit)
        return toast('Choose 1 to 10 topic practice questions.');
    if (!Number.isFinite(per) || per < 0.25 || per > 30)
        return toast('Choose 0.25 to 30 minutes per question.');
    if (quizSource === 'pdf') return toast('Upload material and use Generate & Start Test.');
    launchQuiz(n, byId('testSubject').value);
}
function requestSubmit() {
    const left = answers.filter((a) => a === null).length;
    modal(
        'Submit your test?',
        left
            ? `${left} question${left === 1 ? ' is' : 's are'} unanswered. You can review them or submit now.`
            : 'You have answered every question. Submit to see your results.',
        () => submitTest(),
        'Submit Test',
    );
}
function changeQuestion(dir) {
    if (dir === 1 && current === testQuestions.length - 1) return requestSubmit();
    current = Math.max(0, Math.min(testQuestions.length - 1, current + dir));
    renderQuestion();
}
function filterReview(mode) {
    if (!reviewData) return;
    byId('resultDetails').innerHTML =
        reviewData.questions
            .map((q, i) => {
                let chosen = reviewData.answers[i];
                if (mode === 'incorrect' && chosen === q.a) return '';
                return `<div class="result-item"><div class="flex between"><span class="pill">Question ${i + 1}</span><strong class="${chosen === q.a ? 'good' : 'bad'}">${chosen === null ? 'Skipped' : chosen === q.a ? 'Correct' : 'Incorrect'}</strong></div><strong style="margin-top:12px">${escapeHtml(q.q)}</strong><p class="small">Your answer: <b class="${chosen === q.a ? 'good' : 'bad'}">${chosen === null ? 'Not answered' : escapeHtml(q.o[chosen])}</b></p><p class="small">Correct answer: <b class="good">${escapeHtml(q.o[q.a])}</b></p></div>`;
            })
            .join('') || '<div class="empty">All your answers were correct. Well done!</div>';
}
function dateLabel(date) {
    return new Date(date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}
function renderHistory() {
    byId('historyCount').textContent = attempts.length + ' attempts';
    byId('historyContent').innerHTML = attempts.length
        ? `<table class="table"><thead><tr><th>SUBJECT</th><th>DATE</th><th>QUESTIONS</th><th>SCORE</th><th>REVIEW</th></tr></thead><tbody>${attempts
              .map((a, i) => {
                  let correct = a.answers.filter((v, j) => v === a.questions[j].a).length;
                  return `<tr><td><b>${escapeHtml(a.subject)}</b></td><td>${dateLabel(a.date)}</td><td>${a.questions.length}</td><td class="score">${Math.round((correct / a.questions.length) * 100)}%</td><td><button class="btn soft" onclick="reviewAttempt(${i})">Review →</button></td></tr>`;
              })
              .join('')}</tbody></table>`
        : '<div class="empty"><div style="font-size:40px;margin-bottom:12px">◷</div><h2>Your next step starts here.</h2><p>Complete a test to see your history and answer review.</p><button class="btn primary" style="margin-top:14px" onclick="navigate(\'test\')">Take your first test →</button></div>';
}
async function reviewAttempt(i) {
    if (testRunning) return toast('Finish your current test before opening a past attempt.');
    reviewData = attempts[i];
    await navigate('test');
    byId('testSetup').classList.add('hidden');
    byId('testLive').classList.add('hidden');
    byId('testResults').classList.remove('hidden');
    const correct = reviewData.answers.filter((v, j) => v === reviewData.questions[j].a).length,
        skipped = reviewData.answers.filter((v) => v === null).length;
    byId('resScore').textContent = correct + '/' + reviewData.questions.length;
    byId('resCorrect').textContent = correct;
    byId('resWrong').textContent =
        reviewData.questions.length - correct - skipped;
    byId('resSkip').textContent = skipped;
    filterReview('all');
    byId('liveSourceNote').textContent = reviewData.subject;
}
// EDIT J4 — PAPER PREVIEW AND SAVED-PAPER CARDS
function showFullPreview(answer = false) {
    if (viewingAnswers !== answer && motionEnabled()) {
        byId('fullPreview').animate([{ opacity: 0.55 }, { opacity: 1 }], { duration: 180 });
    }
    viewingAnswers = answer;
    byId('tabPaper').setAttribute('aria-pressed', String(!answer));
    byId('tabAnswer').setAttribute('aria-pressed', String(answer));
    byId('tabPaper').classList.toggle('active', !answer);
    byId('tabAnswer').classList.toggle('active', answer);
    byId('fullPreview').innerHTML = activePaper
        ? fullMarkup(activePaper, answer)
        : '<div class="empty"><h2>No paper yet</h2><p>Set up a paper to see its full preview.</p><button class="btn primary" onclick="navigate(\'create\')">Create Paper →</button></div>';
    byId('paperSummary').innerHTML = activePaper
        ? `<p><b>${escapeHtml(activePaper.subject)}</b></p><p>${activePaper.counts.reduce((a, b) => a + b, 0)} questions · ${escapeHtml(activePaper.marks)} marks</p><p>${escapeHtml(activePaper.duration)} minutes · ${escapeHtml(activePaper.difficulty)}</p><p class="small">${escapeHtml(activePaper.filename)}</p>`
        : '<p>Create a paper first.</p>';
}
function editCurrentPaper() {
    if (activePaper) {
        byId('subject').value = activePaper.subject;
        byId('marks').value = activePaper.marks;
        byId('duration').value = activePaper.duration;
        byId('difficulty').value = activePaper.difficulty;
        document
            .querySelectorAll('.count')
            .forEach((input, i) => (input.value = activePaper.counts[i]));
        updatePreview();
    }
    navigate('create');
}
function renderPapers() {
    const saved = activePaper && savedPapers.some((paper) => String(paper.id) === String(activePaper.id));
    const save = byId('savePaperButton');
    save.disabled = !activePaper || !!saved;
    save.textContent = !authUser ? 'Sign in to save' : saved ? 'In My Papers' : 'Save Paper';
    const grid = document.querySelector('#page-papers .grid');
    grid.innerHTML = savedPapers.length
        ? savedPapers
              .map(
                  (p, i) =>
                      `<div class="card"><div class="tile-icon" style="margin-bottom:18px">▤</div><h2>${escapeHtml(p.subject)}</h2><p>${p.counts.reduce((a, b) => a + b, 0)} questions · ${escapeHtml(p.marks)} marks</p><p class="small">${dateLabel(p.date)} · Saved paper</p><div class="flex" style="margin-top:18px;flex-wrap:wrap"><button class="btn soft" onclick="openPaper(${i})">Open →</button><button class="btn outline" onclick="openSavedPdf(${i})">Open PDF</button><button class="btn outline" onclick="deletePaper(${i})">Delete</button></div></div>`,
              )
              .join('')
        : '<div class="card empty" style="grid-column:1/-1"><h2>A fresh start for your next exam.</h2><p>Choose Save Paper from a paper preview or an online MCQ test to keep it here.</p><button class="btn primary" style="margin-top:15px" onclick="navigate(\'create\')">Create your first paper →</button></div>';
}
function openPaper(i) {
    activePaper = structuredClone(savedPapers[i]);
    generatedDraftKey = null;
    updatePreview();
    viewingAnswers = false;
    navigate('preview');
}
// Save/delete actions are in J8; PDF export is in J7 below.
function toggleText() {
    const on = document.body.classList.toggle('comfortable');
    byId('textToggle').classList.toggle('on', on);
    byId('textToggle').setAttribute('aria-checked', String(on));
}
byId('animationToggle').setAttribute('role', 'switch');
byId('animationToggle').setAttribute('aria-checked', 'true');
document.querySelectorAll('.field').forEach((f) => {
    const l = f.querySelector('label'),
        input = f.querySelector('input,select');
    if (l && input) {
        if (!input.id) input.id = 'field-' + Math.random().toString(36).slice(2, 8);
        l.htmlFor = input.id;
    }
});
document
    .querySelectorAll('.count')
    .forEach((input, i) => input.setAttribute('aria-label', questionTypes[i][1] + ' count'));
byId('toast').setAttribute('role', 'status');
byId('toast').setAttribute('aria-live', 'polite');
document.querySelector('.mobile-menu').setAttribute('aria-label', 'Open navigation');
byId('search').setAttribute('aria-label', 'Search workspace pages');
window.addEventListener('beforeunload', (e) => {
    if (testRunning) {
        e.preventDefault();
        e.returnValue = '';
    }
});
let quizSource = 'pdf',
    runningQuizLabel = 'Data Structures',
    runningQuizSource = 'topic';
const topicNames = {
    ds: 'Data Structures',
    oop: 'OOP — C++ fundamentals',
    pc: 'Permutations & Combinations',
    integration: 'Integration',
};
const topicDescriptions = {
    ds: 'Arrays, stacks, queues, trees and search complexity.',
    oop: 'Classes, objects, inheritance, constructors and polymorphism.',
    pc: 'Factorials, ordered arrangements, combinations and counting.',
    integration: 'Basic antiderivatives, definite integrals and common identities.',
};
function bankFrom(rows) {
    return rows.map(([q, o, a]) => ({ q, o, a }));
}
const topicBanks = {
    ds: quizBank,
    oop: bankFrom([
        [
            'Which OOP concept bundles data with the methods that operate on it?',
            ['Inheritance', 'Encapsulation', 'Recursion', 'Iteration'],
            1,
        ],
        [
            'What is an instance of a class called?',
            ['Object', 'Namespace', 'Header', 'Template argument'],
            0,
        ],
        [
            'Which mechanism lets a derived class reuse members of a base class?',
            ['Overloading', 'Inheritance', 'Compilation', 'Iteration'],
            1,
        ],
        [
            'What is the name of a constructor in C++?',
            [
                'The same name as its class',
                'Always init',
                'The same name as main',
                'Any name with a return type',
            ],
            0,
        ],
        [
            'What return type does a C++ constructor declare?',
            ['void', 'int', 'No return type', 'The class pointer type'],
            2,
        ],
        [
            'Which keyword enables runtime dispatch of a member function in C++?',
            ['static', 'const', 'virtual', 'friend'],
            2,
        ],
        [
            'Which access specifier permits access from anywhere the object is accessible?',
            ['private', 'protected', 'public', 'internal'],
            2,
        ],
        [
            'Two functions have the same name but different parameter lists. What is this?',
            [
                'Function overloading',
                'Function deletion',
                'Virtual inheritance',
                'Data hiding only',
            ],
            0,
        ],
        ['Which symbol begins the name of a C++ destructor?', ['!', '~', '#', '&'], 1],
        [
            'Which OOP concept lets the same interface represent different implementations?',
            ['Polymorphism', 'Iteration', 'Preprocessing', 'Linking'],
            0,
        ],
    ]),
    pc: bankFrom([
        ['What is 5! ?', ['20', '60', '120', '240'], 2],
        [
            'How many arrangements are there of 3 distinct books on a shelf?',
            ['3', '6', '9', '12'],
            1,
        ],
        ['What is the value of 5C2?', ['5', '10', '20', '25'], 1],
        ['What is the value of 5P2?', ['10', '15', '20', '25'], 2],
        [
            'When choosing a committee, with no assigned roles, does order matter?',
            ['Yes, always', 'No', 'Only for two members', 'Only for large groups'],
            1,
        ],
        ['How many ways can 2 students be chosen from 4?', ['4', '6', '8', '12'], 1],
        ['What is the value of 0! ?', ['0', '1', 'Undefined', '10'], 1],
        ['How many arrangements of the letters A, A, B are distinct?', ['2', '3', '6', '9'], 1],
        [
            'Which expression equals nCr?',
            ['n! / (r! (n-r)!)', 'n! / (n-r)!', 'n! × r!', 'n / r'],
            0,
        ],
        ['How many binary strings of length 3 are possible?', ['3', '6', '8', '9'], 2],
    ]),
    integration: bankFrom([
        [
            'What is the indefinite integral of x with respect to x?',
            ['x + C', 'x²/2 + C', '2x + C', '1 + C'],
            1,
        ],
        [
            'What is the indefinite integral of 1 with respect to x?',
            ['0 + C', '1 + C', 'x + C', 'x² + C'],
            2,
        ],
        [
            'What is the indefinite integral of cos(x) with respect to x?',
            ['sin(x) + C', '-sin(x) + C', 'cos(x) + C', '-cos(x) + C'],
            0,
        ],
        [
            'What is the indefinite integral of sin(x) with respect to x?',
            ['cos(x) + C', '-cos(x) + C', 'sin(x) + C', '-sin(x) + C'],
            1,
        ],
        [
            'What is the indefinite integral of eˣ with respect to x?',
            ['xeˣ + C', 'eˣ + C', 'ln(x) + C', '1/eˣ + C'],
            1,
        ],
        [
            'For x ≠ 0, what is the indefinite integral of 1/x?',
            ['x² + C', '1/x² + C', 'ln|x| + C', 'eˣ + C'],
            2,
        ],
        ['What is the definite integral of x from 0 to 1?', ['0', '1/2', '1', '2'], 1],
        ['What is the definite integral of 2 from 1 to 3?', ['2', '3', '4', '6'], 2],
        [
            'What does C represent in an indefinite integral?',
            ['A constant of integration', 'The variable x', 'A derivative', 'An upper limit'],
            0,
        ],
        [
            'For n ≠ -1, what is the indefinite integral of xⁿ?',
            ['nxⁿ⁻¹ + C', 'xⁿ⁺¹/(n+1) + C', 'xⁿ/n + C', 'ln|x| + C'],
            1,
        ],
    ]),
};
function setQuizSource(source) {
    if (generationController) return toast('Wait for generation or cancel before changing the source.');
    quizSource = source;
    const pdf = source === 'pdf';
    byId('quizPdfPanel').classList.toggle('hidden', !pdf);
    byId('quizTopicPanel').classList.toggle('hidden', pdf);
    for (const [id, on] of [
        ['sourcePdf', pdf],
        ['sourceTopic', !pdf],
    ]) {
        byId(id).classList.toggle('selected', on);
        byId(id).setAttribute('aria-pressed', String(on));
    }
    updateQuizSourceNote();
}
function launchQuiz(n, key) {
    answers = Array(n).fill(null);
    current = 0;
    remaining = Math.round(n * Number(byId('timePerQuestion').value) * 60);
    testRunning = true;
    byId('testSetup').classList.add('hidden');
    byId('testResults').classList.add('hidden');
    byId('testLive').classList.remove('hidden');
    updateTimer();
    const shuffled = topicBanks[key].slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    testQuestions = shuffled.slice(0, n);
    runningQuizLabel = topicNames[key];
    runningQuizSource = 'topic';
    rememberTestDetails();
    byId('liveSourceNote').textContent =
        'Topic practice · ' + topicNames[key];
    window.testStartedAt = Date.now();
    startTestTimer();
    renderQuestion();
}
// EDIT J5 — DASHBOARD AND PERFORMANCE: derived from the complete saved attempts list.
function accuracy(a) {
    return Math.round(
        (a.answers.filter((v, i) => v === a.questions[i].a).length / a.questions.length) * 100,
    );
}
function practiceStreak() {
    const day = (d) => {
        const x = new Date(d);
        return [x.getFullYear(), x.getMonth(), x.getDate()].join('-');
    };
    const days = new Set(attempts.map((a) => day(a.date)));
    let cursor = new Date();
    if (!days.has(day(cursor))) cursor.setDate(cursor.getDate() - 1);
    let count = 0;
    while (days.has(day(cursor))) {
        count++;
        cursor.setDate(cursor.getDate() - 1);
    }
    return count;
}
function emptyChart(id) {
    byId(id).innerHTML =
        '<div class="chart-empty"><div class="empty-symbol"><svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 4v16h16M8 15l4-5 4 2 5-7"/></svg></div><h3>Your progress starts with one test.</h3><p>Complete a practice session to see your score trend here.</p><button class="btn soft" onclick="navigate(\'test\')">Take your first test →</button></div>';
}
function drawAttempts(chart, labels, limit) {
    const recent = attempts.slice(0, limit).reverse();
    if (!recent.length) {
        emptyChart(chart);
        document.querySelector(labels).innerHTML = '';
        return;
    }
    makeChart(chart, recent.map(accuracy));
    const svg = byId(chart).querySelector('svg');
    svg.setAttribute(
        'aria-label',
        'Practice accuracy: ' +
            recent.map((a, i) => 'test ' + (i + 1) + ' ' + accuracy(a) + ' percent').join(', '),
    );
    const allLabels =
        recent.length <= 8
            ? recent.map((a, i) => 'Test ' + (attempts.length - recent.length + i + 1))
            : recent
                  .filter((_, i) => i === 0 || i === recent.length - 1)
                  .map((a) => dateLabel(a.date));
    document.querySelector(labels).innerHTML = allLabels
        .map((x) => '<span>' + escapeHtml(x) + '</span>')
        .join('');
}
function refreshDashboard() {
    const total = attempts.length,
        avg = total ? Math.round(attempts.reduce((s, a) => s + accuracy(a), 0) / total) : 0,
        streak = practiceStreak();
    const values = [
        total ? Math.max(...attempts.map(accuracy)) + '%' : '—',
        total,
        total ? avg + '%' : '—',
        streak + ' ' + (streak === 1 ? 'day' : 'days'),
    ];
    document
        .querySelectorAll('#page-dashboard .stats .num')
        .forEach((el, i) => (el.textContent = values[i]));
    document
        .querySelectorAll('#page-dashboard .stats .tag')
        .forEach(
            (el, i) =>
                (el.textContent = [
                    total ? 'Personal best' : 'No tests yet',
                    'Completed',
                    total ? 'Your accuracy' : 'No tests yet',
                    streak ? 'Keep it going' : 'Start today',
                ][i]),
        );
    drawAttempts('dashboardChart', '#page-dashboard .chart-labels', 7);
    const rows = [
        ...savedPapers.map((p) => ({
            title: p.subject,
            type: 'Saved Paper',
            date: p.date,
            score: '—',
            status: 'Saved',
        })),
        ...attempts.map((a) => ({
            title: a.subject,
            type: a.source === 'ai' ? 'Study Material Test' : 'Topic Practice',
            date: a.date,
            score: accuracy(a) + '%',
            status: 'Completed',
        })),
    ]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
    const table = document.querySelector('#page-dashboard .table');
    table.querySelector('tbody').innerHTML = rows.length
        ? rows
              .map(
                  (r) =>
                      `<tr><td><b>${escapeHtml(r.title)}</b></td><td>${r.type}</td><td>${dateLabel(r.date)}</td><td class="score">${r.score}</td><td><span class="status">${r.status}</span></td></tr>`,
              )
              .join('')
        : '<tr><td colspan="5"><div class="activity-empty">No activity yet. Your saved papers and completed tests will appear here.</div></td></tr>';
    const link = document.querySelector('#page-dashboard .section-head a');
    if (link) {
        link.tabIndex = 0;
        link.setAttribute('role', 'button');
        link.onclick = () => navigate('history');
        link.onkeydown = (e) => {
            if (e.key === 'Enter') navigate('history');
        };
    }
}
function renderPerformance() {
    const total = attempts.length,
        avg = total ? Math.round(attempts.reduce((s, a) => s + accuracy(a), 0) / total) : 0;
    const values = [
        total ? avg + '%' : '—',
        total ? Math.max(...attempts.map(accuracy)) + '%' : '—',
        total,
        practiceStreak() + ' days',
    ];
    document
        .querySelectorAll('#page-performance .stats .num')
        .forEach((el, i) => (el.textContent = values[i]));
    document
        .querySelectorAll('#page-performance .stats .tag')
        .forEach(
            (el, i) =>
                (el.textContent = total
                    ? [
                          'Across your tests',
                          'Personal best',
                          'Completed',
                          practiceStreak() ? 'Keep it going' : 'Practice today',
                      ][i]
                    : 'No tests yet'),
        );
    drawAttempts(
        'performanceChart',
        '#performanceLabels',
        byId('chartRange').value === 'month' ? 30 : 7,
    );
    const groups = Object.create(null);
    for (const a of attempts) {
        (groups[a.subject] ??= []).push(accuracy(a));
    }
    byId('subjectBars').innerHTML = Object.keys(groups).length
        ? Object.entries(groups)
              .map(([label, values]) => {
                  const score = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
                  return `<div style="margin-bottom:21px"><div class="flex between" style="margin-bottom:9px"><b>${escapeHtml(label)}</b><b style="color:var(--purple)">${score}%</b></div><div class="progress"><div style="width:${score}%"></div></div><p class="small">${values.length} completed attempt${values.length === 1 ? '' : 's'}</p></div>`;
              })
              .join('')
        : '<p>No topic results yet. Complete a test to see your breakdown.</p>';
    const insight = document.querySelector('#page-performance .two>.card:last-child .mini-card');
    insight.querySelector('strong').textContent = total ? 'Your latest result' : 'Your next step';
    insight.querySelector('p').textContent = total
        ? `You scored ${accuracy(attempts[0])}% in your latest ${attempts[0].subject} test. Review its answers to choose what to practice next.`
        : 'Start with a short practice test. Your score and answer review will help you choose what to focus on.';
    document.querySelector('#page-performance .section-head .pill').textContent = total
        ? 'Your activity'
        : 'Awaiting first test';
}
document.querySelectorAll('.tile[onclick],.card.clickable[onclick]').forEach((el) => {
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            el.click();
        }
    };
});
document.querySelector('[data-page="dashboard"]').setAttribute('aria-current', 'page');
// EDIT J6 — PROFILE AND SUPABASE AUTHENTICATION
function applyProfileName(name) {
    const display = name || 'Student Workspace';
    byId('accountDisplayName').textContent = display;
    document.querySelector('.profile strong').textContent = display;
    const initial = name ? name.trim().slice(0, 1).toUpperCase() : 'S';
    byId('accountAvatar').textContent = initial;
    document.querySelector('.profile .avatar').textContent = initial;
    document.querySelector('#page-dashboard h1').textContent = name
        ? 'Welcome, ' + name + ' 👋'
        : 'Your next exam starts here. 👋';
    byId('profileNameInput').value = name;
}
let authClient = null,
    authUser = null,
    authReady = false,
    closeAuthDialog = null;
function accountKey(kind) {
    return 'examcraft-v2-' + (authUser?.id || 'guest') + '-' + kind;
}
function authError(error) {
    return error?.message || 'Connection failed. Check your internet and try again.';
}
function syncAccount(user, restoring = false) {
    const changed = (authUser?.id || null) !== (user?.id || null);
    authUser = user;
    if (changed) {
        generationController?.abort();
        generatedDraftKey = null;
        for (const kind of ['paper', 'quiz']) {
            setGenerationStatus(kind, 'idle');
            materialFiles[kind] = [];
            renderMaterial(kind);
        }
        resetTest();
        testQuestions = [];
        answers = [];
        reviewData = null;
        activePaper = null;
        byId('resultDetails').innerHTML = '';
        ['resScore', 'resCorrect', 'resWrong', 'resSkip'].forEach(
            (id) => (byId(id).textContent = '—'),
        );
        byId('questionText').textContent = '';
        byId('testOptions').innerHTML = '';
        byId('fullPreview').innerHTML = '';
        byId('paperSummary').innerHTML = '';
        byId('subject').value = '';
        document.querySelectorAll('.count').forEach((x) => (x.value = 0));
        updatePreview();
        savedPapers = user ? readLocal(accountKey('papers')) : [];
        attempts = user ? readLocal(accountKey('attempts')) : [];
        if (!Array.isArray(savedPapers)) savedPapers = [];
        if (!Array.isArray(attempts)) attempts = [];
        const destination = location.hash.slice(1);
        navigate(restoring && Object.hasOwn(pageNames, destination) ? destination : 'dashboard', 'replace');
    }
    applyProfileName(String(user?.user_metadata?.full_name || '').slice(0, 50));
    const settings = byId('page-settings');
    settings.querySelector('.section-head .pill').textContent = user ? 'Signed in' : 'Guest';
    const details = settings.querySelectorAll('.account-detail strong');
    details[0].textContent = user?.email || 'Not signed in';
    details[1].textContent = user ? 'Active account' : 'Guest workspace';
    const accountButton = settings.querySelector('[onclick="showLoginPlaceholder()"]');
    accountButton.hidden = !!user;
    const top = document.querySelector('.login-button');
    top.querySelector('span').textContent = user ? 'My Account' : 'Login';
    top.setAttribute('aria-label', user ? 'My Account' : 'Login');
    const sessionCard = settings.querySelector('[onclick="requestLogout()"]').closest('.card');
    sessionCard.querySelector('p').textContent = user
        ? 'You are signed in to your account.'
        : 'You are currently browsing as a guest.';
    sessionCard.querySelector('p.small').textContent =
        'Signed-in results and saved papers sync to your account. Pending saves retry when you reconnect.';
    sessionCard.querySelector('button').disabled = !user;
    byId('profileNameInput').disabled = !user;
    settings.querySelector('form button').disabled = !user;
    refreshDashboard();
    renderPerformance();
    renderPapers();
    renderHistory();
    document.querySelectorAll('[onclick="saveTestPaper()"]').forEach(
        (button) => (button.hidden = !user),
    );
    byId('paperSaveNote').textContent = user
        ? 'Choose Save Paper to keep a copy in My Papers.'
        : 'Guest paper · Download before reloading, or sign in to keep a copy.';
    updateUploadLimits();
    ExamStore.activate(user);
}
async function saveProfileName() {
    if (!authUser) return showLoginPlaceholder();
    const name = byId('profileNameInput').value.trim();
    if (!name || name.length > 50) return toast('Enter a name with 1–50 characters.');
    const button = document.querySelector('#page-settings form button');
    button.disabled = true;
    try {
        const { data, error } = await authClient.auth.updateUser({
            data: { full_name: name },
        });
        if (error) throw error;
        syncAccount(data.user);
        toast('Name updated.');
    } catch (e) {
        toast(authError(e));
    } finally {
        button.disabled = !authUser;
    }
}
function showLoginPlaceholder() {
    if (authUser) return navigate('settings');
    openAuth('login', byId('page-preview').classList.contains('active') ? activePaper : null);
}
function openAuth(mode = 'login', guestPaper = null) {
    if (closeAuthDialog) closeAuthDialog();
    const root = byId('modalRoot'),
        prior = document.activeElement;
    const signup = mode === 'signup',
        recover = mode === 'recover',
        reset = mode === 'reset';
    const title = signup
        ? 'Create your account'
        : recover
          ? 'Forgot your password?'
          : reset
            ? 'Choose a new password'
            : 'Welcome back';
    root.innerHTML = `<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle" style="max-height:90vh;overflow:auto"><div class="flex between"><h2 id="modalTitle">${title}</h2><button class="round" type="button" id="authClose" aria-label="Close">×</button></div><p>${signup ? 'Your study workspace starts here.' : recover ? 'We will email you a password reset link.' : reset ? 'Update your password to secure your account.' : 'Sign in to your study workspace.'}</p><form class="login-form" id="authForm">${signup ? '<div class="field"><label for="authName">Full name</label><input class="input" id="authName" autocomplete="name" maxlength="50" required></div>' : ''}${!reset ? '<div class="field"><label for="authEmail">Email address</label><input class="input" id="authEmail" type="email" autocomplete="email" required></div>' : ''}${!recover ? `<div class="field"><label for="authPassword">${reset ? 'New password' : 'Password'}</label><input class="input" id="authPassword" type="password" autocomplete="${signup || reset ? 'new-password' : 'current-password'}" minlength="${signup || reset ? 8 : 1}" required>${signup || reset ? '<small>At least 8 characters.</small>' : ''}</div>` : ''}<p id="authMessage" role="status" aria-live="polite" style="color:#47376b;margin:0;overflow-wrap:anywhere"></p><button class="btn primary" id="authSubmit" type="submit">${signup ? 'Create account' : recover ? 'Send reset link' : reset ? 'Save password' : 'Login'}</button></form>${!reset ? `<div class="flex" style="margin-top:18px;flex-wrap:wrap"><button class="btn outline" id="authSwitch">${signup || recover ? 'Back to login' : 'Create account'}</button>${!signup && !recover ? '<button class="btn soft" id="authForgot">Forgot password?</button>' : ''}</div>` : ''}</div></div>`;
    let busy = false;
    const close = () => {
        if (busy) return;
        root.innerHTML = '';
        document.removeEventListener('keydown', trap);
        closeAuthDialog = null;
        prior?.focus();
    };
    const trap = (e) => {
        if (e.key === 'Escape') close();
        if (e.key === 'Tab') {
            const items = [...root.querySelectorAll('button:not(:disabled),input:not(:disabled)')],
                first = items[0],
                last = items.at(-1);
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first?.focus();
            }
        }
    };
    closeAuthDialog = close;
    document.addEventListener('keydown', trap);
    byId('authClose').onclick = close;
    document
        .getElementById('authSwitch')
        ?.addEventListener('click', () => openAuth(signup || recover ? 'login' : 'signup', guestPaper));
    byId('authForgot')?.addEventListener('click', () => openAuth('recover', guestPaper));
    root.querySelector('input')?.focus();
    byId('authForm').onsubmit = async (e) => {
        e.preventDefault();
        if (busy) return;
        const message = byId('authMessage');
        if (!authClient || !authReady) {
            message.textContent =
                'Authentication is unavailable. Check your connection and reload the page.';
            return;
        }
        const email = byId('authEmail')?.value.trim(),
            password = byId('authPassword')?.value,
            name = byId('authName')?.value.trim();
        if (signup && !name) {
            message.textContent = 'Please enter your name.';
            return;
        }
        const controls = [...root.querySelectorAll('input,button')];
        busy = true;
        controls.forEach((x) => (x.disabled = true));
        message.textContent = 'Please wait…';
        const redirect = location.protocol.startsWith('http')
            ? location.origin + location.pathname
            : undefined;
        try {
            if (recover) {
                if (!redirect)
                    throw new Error(
                        'Open this app through http://localhost:8000/FINALV2.html to use password reset.',
                    );
                const { error } = await authClient.auth.resetPasswordForEmail(email, {
                    redirectTo: redirect,
                });
                if (error) throw error;
                message.textContent =
                    'If an account exists, a reset link will be emailed. Check your inbox and spam folder.';
            } else if (reset) {
                const { error } = await authClient.auth.updateUser({ password });
                if (error) throw error;
                busy = false;
                close();
                toast('Password updated.');
                return;
            } else {
                const result = signup
                    ? await authClient.auth.signUp({
                          email,
                          password,
                          options: {
                              data: { full_name: name },
                              ...(redirect ? { emailRedirectTo: redirect } : {}),
                          },
                      })
                    : await authClient.auth.signInWithPassword({ email, password });
                if (result.error) throw result.error;
                if (result.data.session) {
                    syncAccount(result.data.user);
                    busy = false;
                    close();
                    if (guestPaper) {
                        activePaper = guestPaper;
                        generatedDraftKey = null;
                        viewingAnswers = false;
                        await navigate('preview', 'replace');
                    }
                    toast(guestPaper ? 'Signed in. Choose Save Paper to keep this paper.' : 'You are signed in.');
                    return;
                }
                message.textContent =
                    'Check your email for a confirmation link, then return here to log in. If you already have an account, use Login.';
            }
            const field = byId('authPassword');
            if (field) field.value = '';
        } catch (error) {
            message.textContent = authError(error);
        } finally {
            busy = false;
            controls.forEach((x) => (x.disabled = false));
        }
    };
}
async function requestLogout() {
    if (!authUser) return toast('You are not signed in.');
    try {
        const { error } = await authClient.auth.signOut({ scope: 'local' });
        if (error) throw error;
        syncAccount(null);
        toast('Logged out.');
    } catch (e) {
        toast(authError(e));
    }
}
async function initializeAuth() {
    syncAccount(null);
    const config = await window.examConfigPromise;
    if (!config?.supabase_url || !config.supabase_public_key) return;
    const authScript = document.createElement('script');
    authScript.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/dist/umd/supabase.js';
    authScript.onload = () => {
        try {
            authClient = window.supabase.createClient(
                config.supabase_url, config.supabase_public_key,
            );
            authClient.auth.onAuthStateChange((event, session) => {
                const restoring = !authReady && event !== 'PASSWORD_RECOVERY';
                authReady = true;
                if (!navigationReady) initializeNavigation();
                syncAccount(session?.user || null, restoring);
                if (event === 'PASSWORD_RECOVERY') setTimeout(() => openAuth('reset'), 0);
            });
        } catch (e) {
            toast(authError(e));
        }
    };
    document.head.appendChild(authScript);
}

// EDIT J7 — UPLOADS, AI GENERATION, ANSWER PREVIEW AND PDF EXPORT
// 1. GENERATION STATE AND VISIBLE PROGRESS
const materialFiles = { paper: [], quiz: [] };
const materialUrls = { paper: [], quiz: [] };
let generationController = null;
let generatedDraftKey = null;
let generationStartedAt = 0;
const generationState = { paper: { phase: 'idle' }, quiz: { phase: 'idle' } };
function byId(id) {
    return document.getElementById(id);
}

function setGenerationStatus(kind, phase, message = '') {
    generationState[kind] = { phase, message };
    const targets = [byId(kind + 'GenerationStatus')];
    if (kind === 'paper') targets.push(byId('paperPreviewStatus'));
    for (const box of targets.filter(Boolean)) {
        box.replaceChildren();
        box.dataset.phase = phase;
        box.hidden = !message;
        if (!message) continue;
        const row = document.createElement('div');
        row.className = 'generation-status-row';
        if (phase === 'busy') {
            const spinner = document.createElement('span');
            spinner.className = 'generation-spinner';
            spinner.setAttribute('aria-hidden', 'true');
            row.append(spinner);
        }
        const label = document.createElement('span');
        label.className = 'generation-status-message';
        label.textContent = message;
        row.append(label);
        if (phase === 'busy') {
            const elapsed = document.createElement('span');
            elapsed.className = 'generation-elapsed';
            elapsed.setAttribute('aria-live', 'off');
            row.append(elapsed);
            if (generationController) {
                const cancel = document.createElement('button');
                cancel.className = 'btn outline';
                cancel.type = 'button';
                cancel.textContent = 'Cancel';
                cancel.onclick = () => generationController?.abort();
                row.append(cancel);
            }
        }
        box.append(row);
    }
    updateGenerationClock();
}

function updateGenerationClock() {
    const seconds = Math.max(0, Math.floor((Date.now() - generationStartedAt) / 1000));
    document.querySelectorAll('.generation-elapsed').forEach((el) => {
        el.textContent =
            seconds < 60
                ? `${seconds}s elapsed`
                : `${Math.floor(seconds / 60)}m ${seconds % 60}s elapsed`;
    });
}

function showGenerationError(kind, message) {
    setGenerationStatus(kind, 'error', message);
    toast(message);
}
function initializeUpload(kind, inputId, zoneId) {
    const input = byId(inputId),
        zone = byId(zoneId);
    zone.onclick = () => input.click();
    zone.ondragover = (event) => {
        event.preventDefault();
        zone.classList.add('drag');
    };
    zone.ondragleave = () => zone.classList.remove('drag');
    input.onchange = () => {
        addMaterial(kind, [...input.files]);
        input.value = '';
    };
    zone.ondrop = (e) => {
        e.preventDefault();
        zone.classList.remove('drag');
        addMaterial(kind, [...e.dataTransfer.files]);
    };
    const list = document.createElement('div');
    list.className = 'source-files';
    list.id = kind + 'FileList';
    zone.after(list);
    const status = document.createElement('div');
    status.id = kind + 'GenerationStatus';
    status.className = 'generation-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    const generateButton =
        kind === 'paper'
            ? byId('generateButton')
            : document.querySelector('#testSetup button[onclick="startTest()"]');
    generateButton.after(status);
    const note = document.createElement('p');
    note.className = 'upload-limit';
    note.id = kind + 'UploadLimit';
    list.after(note);
}
async function updateUploadLimits() {
    const config = await window.examConfigPromise;
    const megabytes = authUser ? 50 : (config?.guest_upload_max_bytes ??
        (config?.upload_mode === 'storage' ? 3 : 50) * 1024 * 1024) / 1024 / 1024;
    for (const [kind, zoneId] of [['paper', 'upload'], ['quiz', 'quizUpload']]) {
        byId(zoneId).querySelector('.upload-meta').textContent =
            `PDF, JPG, PNG or WebP · 8 files · ${megabytes} MB total`;
        byId(kind + 'UploadLimit').textContent = 'Add notes, a syllabus or both. You can drag files here.';
    }
}
function addMaterial(kind, files) {
    if (generationController) return toast('Wait for generation or cancel before changing files.');
    if (!files.length) return;
    if (files.some((f) => !/^.+\.(pdf|jpe?g|png|webp)$/i.test(f.name)))
        return toast('Choose PDF, JPG, PNG or WebP files.');
    // Keep notes and syllabus together; filter accidental duplicate selections.
    const unique = new Map(
        [...materialFiles[kind], ...files].map((file) => [
            [file.name, file.size, file.lastModified].join(':'),
            file,
        ]),
    );
    const next = [...unique.values()];
    if (next.some((file) => !file.size)) return toast('Choose non-empty files.');
    if (next.length > 8) return toast('Choose up to 8 PDF or image files together.');
    if (next.reduce((s, f) => s + f.size, 0) > 50 * 1024 * 1024)
        return toast('Keep the combined upload size within 50 MB.');
    materialFiles[kind] = next;
    renderMaterial(kind);
}
function removeMaterial(kind, index) {
    if (generationController) return toast('Cancel generation before changing files.');
    materialFiles[kind].splice(index, 1);
    renderMaterial(kind);
}
function renderMaterial(kind) {
    materialUrls[kind].forEach(URL.revokeObjectURL);
    materialUrls[kind] = [];
    const list = byId(kind + 'FileList');
    list.replaceChildren();
    materialFiles[kind].forEach((file, index) => {
        const card = document.createElement('div');
        card.className = 'source-file';
        if (!/\.pdf$/i.test(file.name)) {
            const img = document.createElement('img'),
                url = URL.createObjectURL(file);
            materialUrls[kind].push(url);
            img.src = url;
            img.alt = 'Source image ' + (index + 1);
            card.append(img);
        }
        const name = document.createElement('strong');
        name.textContent = index + 1 + '. ' + file.name;
        card.append(name);
        const remove = document.createElement('button');
        remove.className = 'btn outline';
        remove.type = 'button';
        remove.textContent = 'Remove';
        remove.onclick = () => removeMaterial(kind, index);
        card.append(remove);
        list.append(card);
    });
    const label = byId(kind === 'paper' ? 'fileLabel' : 'quizFileLabel');
    label.textContent = materialFiles[kind].length
        ? materialFiles[kind].length + (materialFiles[kind].length === 1 ? ' file' : ' files') + ' selected · Add more'
        : 'Add notes or syllabus';
    if (kind === 'paper') updatePreview();
}
initializeUpload('paper', 'pdfFile', 'upload');
initializeUpload('quiz', 'quizPdfFile', 'quizUpload');
const previewStatus = document.createElement('div');
previewStatus.id = 'paperPreviewStatus';
previewStatus.className = 'generation-status';
previewStatus.setAttribute('role', 'status');
previewStatus.setAttribute('aria-live', 'polite');
byId('paperPreview').before(previewStatus);
byId('subject').maxLength = 120;
function updateQuizSourceNote() {
    const pdf = quizSource === 'pdf';
    byId('mcqCount').max = pdf ? 50 : topicPracticeLimit;
    byId('topicNote').textContent =
        topicDescriptions[byId('testSubject').value] + ' 10 practice questions available.';
    document.querySelector('#testSetup .footer-note').textContent = pdf
        ? 'Questions from your study material · Up to 50 questions'
        : 'Topic practice · 1–10 questions';
    document.querySelector('#testSetup button[onclick="startTest()"]').textContent = pdf
        ? 'Generate & Start Test'
        : '▶ Start Topic Practice';
}
updateQuizSourceNote();
function paperDraftKey() {
    return JSON.stringify({
        subject: byId('subject').value.trim(),
        marks: byId('marks').value,
        duration: byId('duration').value,
        difficulty: byId('difficulty').value,
        counts: getCounts(),
        files: materialFiles.paper.map((file) => [file.name, file.size, file.lastModified]),
    });
}

function draftPaperMarkup(counts) {
    const subject = byId('subject').value.trim() || 'Your subject';
    const total = counts.reduce((sum, count) => sum + count, 0);
    let markup = `<h3>${escapeHtml(subject.toUpperCase())}</h3>
        <div class="sub">QUESTION PAPER · DRAFT</div>
        <div class="marks">Time: ${escapeHtml(byId('duration').value || '—')} minutes · Marks: ${escapeHtml(byId('marks').value || '—')}</div>
        <div class="draft-summary"><span>${total} question${total === 1 ? '' : 's'}</span><span>${escapeHtml(byId('difficulty').value)}</span></div>
        <p class="draft-note">Live outline · Your questions will appear after generation.</p>`;
    let section = 0;
    counts.forEach((count, index) => {
        if (!count) return;
        markup += `<h4>SECTION ${String.fromCharCode(65 + section++)} — ${escapeHtml(questionTypes[index][1].toUpperCase())}</h4>`;
        markup += `<p class="small">${count} question${count === 1 ? '' : 's'}</p>`;
    });
    if (!total) markup += '<p>Choose your question counts to build the paper outline.</p>';
    if (total > 50) markup += '<p class="bad">Choose up to 50 questions per paper.</p>';
    return markup;
}

function updatePreview() {
    const counts = getCounts();
    const total = String(counts.reduce((a, b) => a + b, 0)), counter = byId('totalQuestions');
    if (counter.textContent !== total && motionEnabled()) {
        counter.animate([{ transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 180 });
    }
    counter.textContent = total;
    document.querySelectorAll('.counter-row').forEach((row, i) => {
        row.classList.toggle('included', counts[i] > 0);
    });
    const generated = !!activePaper && generatedDraftKey === paperDraftKey();
    byId('paperPreview').innerHTML = generated
        ? fullMarkup(activePaper, false)
        : draftPaperMarkup(counts);
    document.querySelector('#page-create .studio-preview .pill').textContent = generated
        ? 'AI Paper'
        : 'Live Draft';
    document.querySelectorAll('#page-create .studio-preview button').forEach((button) => {
        button.disabled = !generated || generationState.paper.phase === 'busy';
    });
    if (!generated && generationState.paper.phase === 'success') {
        setGenerationStatus(
            'paper',
            'idle',
            'Details changed. Generate again to update the questions.',
        );
    }
}
function fullMarkup(p, answer = false) {
    return `<h3>${escapeHtml(p.subject.toUpperCase())}</h3><div class="sub">${answer ? 'ANSWER KEY' : 'QUESTION PAPER'}</div><div class="marks">Time: ${escapeHtml(p.duration)} minutes · Marks: ${escapeHtml(p.marks)}</div>${p.sections.map((s, i) => `<h4>SECTION ${String.fromCharCode(65 + i)} — ${escapeHtml(s.type.toUpperCase())}</h4>${s.questions.map((q) => `<p><b>${q.number}.</b> ${escapeHtml(q.text)}</p>${answer ? `<p><b>Answer:</b> ${escapeHtml(q.answer)}</p><p class="source-ref">Source: ${escapeHtml(q.source || 'Not recorded')}</p>` : q.options ? `<p>${q.options.map((v, j) => String.fromCharCode(65 + j) + ') ' + escapeHtml(v)).join('\n')}</p>` : ''}`).join('')}`).join('')}`;
}
updatePreview();
document.querySelectorAll('#subject, #duration, #marks, #difficulty, .count').forEach((input) => {
    input.oninput = updatePreview;
    input.onchange = updatePreview;
});
function readBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read ' + file.name));
        reader.onload = () =>
            resolve({ name: file.name, data: String(reader.result).split(',')[1] });
        reader.readAsDataURL(file);
    });
}
// 3. GUEST OR AUTHENTICATED GENERATION REQUEST
// Hosted large files bypass the function body limit via private Supabase Storage.
async function requestQuestions(kind, counts, subject, difficulty) {
    if (!materialFiles[kind].length) throw new Error('Upload a PDF or your study images first.');
    if (generationController) throw new Error('Another generation is in progress.');
    const owner = authUser?.id || null,
        controller = new AbortController();
    generationController = controller;
    generationStartedAt = Date.now();
    setGenerationStatus(kind, 'busy', 'Preparing generation — reading your files…');
    const ticker = setInterval(updateGenerationClock, 1000);
    const timeout = setTimeout(() => controller.abort(), 9 * 60 * 1000);
    const uploadedPaths = [];
    let uploadAuthorization, config;
    try {
        config = await window.examConfigPromise;
        if (!config) throw new Error('Cannot reach the server. Reload and try again.');
        const totalBytes = materialFiles[kind].reduce((sum, file) => sum + file.size, 0);
        const guestLimit = config?.guest_upload_max_bytes ??
            (config?.upload_mode === 'storage' ? 3 : 50) * 1024 * 1024;
        if (!owner && totalBytes > guestLimit)
            throw new Error('Guest uploads can total up to ' + (guestLimit / 1024 / 1024) +
                ' MB. Use smaller files or log in for larger uploads.');
        // Base64 adds roughly one third. Keep JSON well below Vercel's 4.5 MB cap.
        const useStorage =
            !!owner && config.upload_mode === 'storage' && totalBytes > guestLimit;
        let files;
        if (useStorage) {
            files = [];
            const { data, error } = await authClient.auth.getSession();
            if (error || data.session?.user.id !== owner) throw new Error('Please log in again.');
            uploadAuthorization = data.session.access_token;
            for (const file of materialFiles[kind]) {
                if ((authUser?.id || null) !== owner)
                    throw new Error('Your account changed. Please generate again.');
                const extension = file.name.split('.').pop().toLowerCase();
                const path = owner + '/' + crypto.randomUUID() + '.' + extension;
                // Register BEFORE upload: cancellation can happen after the server accepts bytes.
                uploadedPaths.push(path);
                setGenerationStatus(kind, 'busy', 'Uploading ' + file.name + '…');
                const contentTypes = {
                    pdf: 'application/pdf',
                    jpg: 'image/jpeg',
                    jpeg: 'image/jpeg',
                    png: 'image/png',
                    webp: 'image/webp',
                };
                const upload = await fetch(
                    config.supabase_url + '/storage/v1/object/examcraft-material/' + path,
                    {
                        method: 'POST',
                        headers: {
                            apikey: config.supabase_public_key,
                            Authorization: 'Bearer ' + uploadAuthorization,
                            'Content-Type': contentTypes[extension],
                        },
                        body: file,
                        signal: controller.signal,
                    },
                );
                if (!upload.ok)
                    throw new Error(
                        'File upload failed. Check your connection and run the Supabase SQL in README.txt in your Supabase project.',
                    );
                files.push({ name: file.name, storage_path: path });
            }
        } else {
            files = await Promise.all(materialFiles[kind].map(readBase64));
        }
        if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        setGenerationStatus(
            kind,
            'busy',
            kind === 'paper'
                ? 'Generating your question paper… Please keep this page open.'
                : 'Generating your MCQ test… Please keep this page open.',
        );
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(useStorage ? { Authorization: 'Bearer ' + uploadAuthorization } : {}),
            },
            body: JSON.stringify({
                files,
                counts,
                subject,
                difficulty,
                upload_mode: useStorage ? 'storage' : 'inline',
            }),
            signal: controller.signal,
        });
        let result;
        try {
            result = await response.json();
        } catch {
            const message =
                response.status === 413
                    ? 'The host rejected this upload size. Refresh the page to use the updated upload path.'
                    : response.status === 504
                      ? 'The host timed out. Try fewer questions or smaller files.'
                      : 'The backend returned no JSON (HTTP ' +
                        response.status +
                        '). Check the Python deployment and environment variables.';
            throw new Error(message);
        }
        if (!response.ok) throw new Error(result.error || 'Generation failed.');
        if ((authUser?.id || null) !== owner) throw new Error('Your account changed. Please generate again.');
        setGenerationStatus(
            kind,
            'success',
            'Ready in ' + Math.ceil((Date.now() - generationStartedAt) / 1000) + 's · ' + result.material_kind,
        );
        return result;
    } catch (error) {
        const message =
            error.name === 'AbortError'
                ? 'Generation cancelled or timed out. Any request already sent to Gemini may still consume quota.'
                : error.message;
        const failure = new Error(message);
        failure.accountChanged = (authUser?.id || null) !== owner;
        if (!failure.accountChanged) setGenerationStatus(kind, 'error', message);
        throw failure;
    } finally {
        clearTimeout(timeout);
        clearInterval(ticker);
        if (uploadedPaths.length && uploadAuthorization) {
            // A separate signal allows cleanup after generation cancellation.
            // Do not delay a ready paper while temporary uploads are removed.
            void fetch(
                config.supabase_url + '/storage/v1/object/examcraft-material',
                {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        apikey: config.supabase_public_key,
                        Authorization: 'Bearer ' + uploadAuthorization,
                    },
                    body: JSON.stringify({ prefixes: uploadedPaths }),
                    signal: AbortSignal.timeout(8000),
                },
            ).then((cleanup) => {
                if (!cleanup.ok) console.warn('Temporary upload cleanup will need retry.');
            }).catch(() => {
                console.warn('Temporary upload cleanup could not finish.');
            });
        }
        if (generationController === controller) generationController = null;
    }
}
async function generatePaper() {
    if (generationController) return toast('A generation is already in progress.');
    const counts = getCounts(),
        subject = byId('subject').value.trim(),
        marks = Number(byId('marks').value),
        duration = Number(byId('duration').value),
        difficulty = byId('difficulty').value;
    if (!subject) return showGenerationError('paper', 'Enter a subject name.');
    if (
        [...document.querySelectorAll('.count')].some(
            (input) =>
                !Number.isInteger(Number(input.value)) ||
                Number(input.value) < 0 ||
                Number(input.value) > 50,
        )
    ) {
        return showGenerationError('paper', 'Enter whole-number counts from 0 to 50.');
    }
    if (counts.reduce((a, b) => a + b, 0) < 1 || counts.reduce((a, b) => a + b, 0) > 50)
        return showGenerationError('paper', 'Choose 1–50 questions in total.');
    if (
        !Number.isFinite(marks) ||
        marks <= 0 ||
        !Number.isFinite(duration) ||
        duration < 1 ||
        duration > 600
    )
        return showGenerationError('paper', 'Enter valid marks and a duration from 1–600 minutes.');
    const button = byId('generateButton');
    const draftKey = paperDraftKey();
    const filename = materialFiles.paper.map((file) => file.name).join(', ');
    const inputs = [...document.querySelectorAll('#page-create input, #page-create select, #upload')].map(
        (input) => [input, input.disabled],
    );
    inputs.forEach(([input]) => (input.disabled = true));
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.innerHTML = '<span class="generation-spinner" aria-hidden="true"></span> Generating…';
    generationStartedAt = Date.now();
    setGenerationStatus('paper', 'busy', 'Preparing your question paper…');
    updatePreview();
    try {
        const result = await requestQuestions('paper', counts, subject, difficulty);
        const sections = result.sections;
        activePaper = {
            id: crypto.randomUUID(),
            subject,
            marks,
            duration,
            difficulty,
            counts,
            sections,
            date: new Date().toISOString(),
            filename,
            source: 'ai',
            materialKind: result.material_kind,
        };
        generatedDraftKey = draftKey;
        viewingAnswers = false;
        updatePreview();
        await navigate('preview');
        toast('Your question paper is ready. Review it before use.');
    } catch (e) {
        if (!e.accountChanged) showGenerationError('paper', e.message);
    } finally {
        inputs.forEach(([input, disabled]) => (input.disabled = disabled));
        button.disabled = false;
        button.setAttribute('aria-busy', 'false');
        button.textContent = 'Generate Question Paper';
        updatePreview();
    }
}
async function startTest() {
    if (generationController) return toast('A generation is already in progress.');
    if (quizSource !== 'pdf') return startTopicPractice();
    const n = Number(byId('mcqCount').value),
        per = Number(byId('timePerQuestion').value);
    if (!Number.isInteger(n) || n < 1 || n > 50)
        return showGenerationError('quiz', 'Choose 1–50 MCQs.');
    if (!Number.isFinite(per) || per < 0.25 || per > 30)
        return showGenerationError('quiz', 'Choose 0.25–30 minutes per question.');
    const button = document.querySelector('#testSetup button[onclick="startTest()"]');
    const controls = [...document.querySelectorAll('#testSetup input, #testSetup select, #testSetup button')]
        .map((input) => [input, input.disabled]);
    controls.forEach(([input]) => (input.disabled = true));
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.innerHTML = '<span class="generation-spinner" aria-hidden="true"></span> Generating…';
    generationStartedAt = Date.now();
    setGenerationStatus('quiz', 'busy', 'Preparing your MCQ test…');
    try {
        const result = await requestQuestions(
            'quiz',
            [n, 0, 0, 0, 0],
            'Uploaded study material',
            'Balanced',
        );
        testQuestions = result.sections[0].questions.map((q) => ({
            q: q.text,
            o: q.options,
            a: q.options.indexOf(q.answer),
            source: q.source,
        }));
        answers = Array(n).fill(null);
        current = 0;
        remaining = Math.round(n * per * 60);
        testRunning = true;
        runningQuizLabel = 'Study material MCQ test';
        runningQuizSource = 'ai';
        rememberTestDetails(result.material_kind);
        window.testStartedAt = Date.now();
        byId('testSetup').classList.add('hidden');
        byId('testResults').classList.add('hidden');
        byId('testLive').classList.remove('hidden');
        byId('liveSourceNote').textContent =
            'AI questions from ' + materialFiles.quiz.map((f) => f.name).join(', ');
        renderQuestion();
        updateTimer();
        startTestTimer();
        toast('Your test has started.');
    } catch (e) {
        if (!e.accountChanged) showGenerationError('quiz', e.message);
    } finally {
        controls.forEach(([input, disabled]) => (input.disabled = disabled));
        button.disabled = false;
        button.setAttribute('aria-busy', 'false');
        updateQuizSourceNote();
    }
}
// Export only generated/saved content, never the prototype question bank.
function downloadPaper(answer) {
    if (!activePaper) return toast('Generate a paper first.');
    if (document.querySelector('#page-create.active') && generatedDraftKey !== paperDraftKey()) {
        return toast('Generate your current paper settings before downloading.');
    }
    const w = window.open('', '_blank');
    if (!w) return toast('Allow pop-ups to export your PDF.');
    w.document.write(
        `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(activePaper.subject)} — ${answer ? 'Answer Key' : 'Question Paper'}</title><style>body{font:15px/1.65 Arial,sans-serif;color:#161622;background:#fff;margin:32px}h3,h4,.sub{text-align:center}.marks{text-align:right;border-bottom:1px solid #aaa}p{white-space:pre-wrap;break-inside:avoid}.small,.source-ref{font-size:12px;color:#4b445a}.printbar{padding:16px;background:#f0eaff}button{background:#623ac5;color:white;padding:12px 20px;border:0;border-radius:8px}@media print{@page{size:A4;margin:18mm}body{margin:0}.printbar{display:none}}</style></head><body><div class="printbar"><button onclick="window.print()">Print / Save as PDF</button><p>Choose “Save as PDF” as the destination.</p></div>${fullMarkup(activePaper, answer)}</body></html>`,
    );
    w.document.close();
    w.focus();
}
// 5. SHARED CONFIGURATION: key status and public Supabase settings (never the AI key).
window.examConfigPromise = fetch('/api/status', { signal: AbortSignal.timeout(15000) })
    .then(async (response) => {
        if (!response.ok) throw new Error('Backend unavailable (HTTP ' + response.status + ').');
        const config = await response.json();
        if (!config.configured && !generationController)
            setGenerationStatus(
                'paper',
                'error',
                'GEMINI_API_KEY is missing. Set it in Vercel Environment Variables or local .env, then redeploy/restart.',
            );
        return config;
    })
    .catch((error) => {
        setGenerationStatus(
            'paper',
            'error',
            error.message + ' Check that the Python app is deployed with the frontend.',
        );
        return null;
    });

// EDIT J8 — ACCOUNT HISTORY, SAVE PAPER, RETRY AND LOGOUT PERSISTENCE
/* Account persistence. VIVA: follow saveAttempt/savePaper -> queue -> sync -> Supabase.
 * Each test/paper is a separate row. We never overwrite the entire cloud history.
 * An outbox keeps unsent changes across logout/reload. RLS enforces account ownership.
 * Existing account-specific v2 browser records are imported without truncating them.
 */
const ExamStore = (() => {
    const TABLES = { attempts: 'examcraft_attempts', papers: 'examcraft_papers' };
    let owner = null,
        epoch = 0,
        syncJob = null,
        retryTimer = null;
    const pendingMemory = new Map();
    const acknowledged = new Map();
    const migrated = new Set();
    const cacheKey = (user, kind) => 'examcraft-v2-' + user + '-' + kind;
    const queueKey = (user) => 'examcraft-v3-' + user + '-outbox';
    const statusBox = document.createElement('div');
    statusBox.className = 'generation-status';
    statusBox.id = 'accountSyncStatus';
    statusBox.setAttribute('role', 'status');
    statusBox.setAttribute('aria-live', 'polite');
    document.querySelector('#page-settings .section-head').after(statusBox);
    const retryButton = document.createElement('button');
    retryButton.className = 'btn outline';
    retryButton.textContent = 'Retry sync';
    retryButton.onclick = () => sync();
    statusBox.after(retryButton);

    function status(message, failed = false) {
        statusBox.textContent = message;
        statusBox.dataset.phase = failed ? 'error' : 'success';
        retryButton.hidden = !failed || !owner;
        // Keep pending-save errors visible on the relevant history screens too.
        for (const page of ['papers', 'history', 'performance', 'test']) {
            let label = byId(page + 'SyncStatus');
            if (!label) {
                label = document.createElement('p');
                label.id = page + 'SyncStatus';
                label.className = 'small';
                label.setAttribute('role', 'status');
                document.querySelector('#page-' + page + ' .pagehead').after(label);
            }
            label.textContent = message;
        }
    }
    function list(key) {
        const value = readLocal(key);
        return Array.isArray(value) ? value : [];
    }
    function refresh() {
        refreshDashboard();
        renderPerformance();
        renderPapers();
        renderHistory();
    }
    function cache() {
        const user = authUser?.id;
        if (!user) return false;
        try {
            localStorage.setItem(cacheKey(user, 'papers'), JSON.stringify(savedPapers));
            localStorage.setItem(cacheKey(user, 'attempts'), JSON.stringify(attempts));
            return true;
        } catch {
            return false;
        } // Outbox is written first, separately from the cache.
    }
    function outbox(user) {
        const merged = new Map(list(queueKey(user)).map((op) => [op.key, op]));
        for (const op of pendingMemory.get(user) || []) {
            const prior = merged.get(op.key);
            if (!prior || op.stamp >= prior.stamp) merged.set(op.key, op);
        }
        return [...merged.values()].filter((op) => !acknowledged.get(user)?.has(op.nonce));
    }
    function writeOutbox(user, operations) {
        pendingMemory.set(user, operations);
        try {
            localStorage.setItem(queueKey(user), JSON.stringify(operations));
            return true;
        } catch {
            return false;
        }
    }
    function queue(kind, data, deleted = false) {
        if (!owner) return false;
        const operations = outbox(owner),
            key = kind + ':' + data.id;
        const existing = operations.find((op) => op.key === key);
        // A stale browser cache must never resurrect a deleted cloud paper.
        if (existing?.deleted && !deleted) return true;
        const op = {
            key,
            kind,
            id: String(data.id),
            data: structuredClone(data),
            deleted,
            nonce: crypto.randomUUID(),
            stamp: Date.now(),
        };
        return writeOutbox(owner, operations.filter((item) => item.key !== key).concat(op));
    }
    function acknowledge(user, sent) {
        // A delete/save queued during a request has a new nonce and is retained.
        const nonces = new Set(sent.map((op) => op.nonce));
        const known = acknowledged.get(user) || new Set();
        for (const nonce of nonces) known.add(nonce);
        acknowledged.set(user, known);
        writeOutbox(
            user,
            outbox(user).filter((op) => !nonces.has(op.nonce)),
        );
    }
    function current(user, token) {
        return owner === user && authUser?.id === user && epoch === token;
    }
    function errorMessage(error, kind) {
        const table = TABLES[kind];
        if (['42P01', 'PGRST205', '42703', 'PGRST204', '42P10'].includes(error?.code))
            return table + ': database table/columns need setup. See Supabase setup in README.txt, then Retry sync in Settings.';
        if (error?.code === '42501')
            return table + ': saving permission denied. Check this table’s grants and RLS policies in README.txt, then Retry sync.';
        return 'Cloud sync failed. Unsynced items remain on this device when browser storage is available. Reconnect and choose Retry sync in Settings.';
    }
    async function loadRows(table, user, token) {
        const rows = [];
        // Supabase normally caps a response at 1000 rows; paginate all history.
        // Use the ACTUAL returned page size so smaller project row caps work too.
        let offset = 0;
        for (;;) {
            if (!current(user, token)) return null;
            const { data, error } = await authClient
                .from(table)
                .select('*')
                .eq('user_id', user)
                .order('id', { ascending: true })
                .range(offset, offset + 499);
            if (error) throw error;
            if (!data?.length) break;
            rows.push(...data);
            offset += data.length;
        }
        return rows;
    }
    const sortNewest = (items) => items.sort((a, b) => new Date(b.date) - new Date(a.date));
    function mergeRows(rows, local, kind, user) {
        const removed = new Set(rows.filter((row) => row.deleted).map((row) => String(row.id)));
        for (const op of outbox(user)) if (op.kind === kind && op.deleted) removed.add(op.id);
        const merged = new Map(local.map((item) => [String(item.id), item]));
        for (const row of rows)
            if (!row.deleted && row.data && typeof row.data === 'object')
                merged.set(String(row.id), { ...row.data, id: row.id });
        // The outbox can survive a failed cache write; restore its full snapshots.
        for (const op of outbox(user))
            if (op.kind === kind && !op.deleted) merged.set(op.id, op.data);
        return sortNewest([...merged.values()].filter((item) => !removed.has(String(item.id))));
    }
    async function syncKind(kind, user, token) {
        // Upload pending rows before loading. Immutable inserts + stable IDs
        // make duplicate submissions/retries safe and preserve other devices.
        while (current(user, token)) {
            const operations = outbox(user).filter((op) => op.kind === kind);
            if (!operations.length) break;
            const first = operations[0];
            const batch = operations
                .filter((op) => op.deleted === first.deleted)
                .slice(0, 50);
            const rows = batch.map((op) => ({
                user_id: user,
                id: op.id,
                data: op.data,
                created_at: op.data.date,
                ...(op.kind === 'papers' ? { deleted: op.deleted } : {}),
            }));
            const { error } = await authClient.from(TABLES[kind]).upsert(rows, {
                onConflict: 'user_id,id',
                ignoreDuplicates: !first.deleted,
            });
            if (error) throw error;
            if (!current(user, token)) return false;
            acknowledge(user, batch);
        }
        const rows = await loadRows(TABLES[kind], user, token);
        if (!current(user, token) || !rows) return false;
        // Only migrate legacy local records missing from this account's cloud rows.
        const migrationKey = cacheKey(user, kind);
        if (!migrated.has(migrationKey)) {
            const known = new Set(rows.map((row) => String(row.id)));
            for (const item of kind === 'papers' ? savedPapers : attempts)
                if (!known.has(String(item.id))) queue(kind, item);
            migrated.add(migrationKey);
        }
        if (kind === 'papers') savedPapers = mergeRows(rows, savedPapers, kind, user);
        else attempts = mergeRows(rows, attempts, kind, user);
        return true;
    }
    async function performSync(user, token) {
        if (!current(user, token)) return false;
        status('Syncing your account…');
        const kinds = Object.keys(TABLES);
        // A missing My Papers table must not block test scores, or vice versa.
        const results = await Promise.allSettled(kinds.map((kind) => syncKind(kind, user, token)));
        if (!current(user, token)) return false;
        cache();
        refresh();
        clearTimeout(retryTimer);
        const errors = results.flatMap((result, index) =>
            result.status === 'rejected' ? [errorMessage(result.reason, kinds[index])] : []);
        if (errors.length) {
            status([...new Set(errors)].join(' '), true);
            retryTimer = setTimeout(() => sync(), 30000);
            return false;
        }
        const pending = outbox(user).length;
        status(pending ? 'New changes are waiting to sync…' : 'All tests and saved papers are synced to your account.');
        if (pending) setTimeout(() => sync(), 0);
        return pending === 0;
    }
    function sync() {
        if (!owner || !authClient) return Promise.resolve(false);
        if (syncJob && syncJob.user === owner && syncJob.epoch === epoch) return syncJob.promise;
        const job = { user: owner, epoch };
        job.promise = performSync(owner, epoch).finally(() => {
            if (syncJob === job) syncJob = null;
        });
        syncJob = job;
        return job.promise;
    }
    function activate(user) {
        const next = user?.id || null;
        if (next === owner && user) return;
        owner = next;
        epoch++;
        clearTimeout(retryTimer);
        if (!user) {
            attempts = [];
            refresh();
            status('Sign in to save papers, test history and performance. Guest work is not saved.');
            retryButton.hidden = true;
            return;
        }
        savedPapers = mergeRows([], savedPapers, 'papers', next);
        attempts = mergeRows([], attempts, 'attempts', next);
        refresh();
        // Defer Supabase requests outside onAuthStateChange to avoid auth-lock deadlocks.
        setTimeout(() => sync(), 0);
    }
    function saveAttempt(attempt) {
        if (!owner) {
            refresh();
            status('Test complete. Sign in before your next test to save its history and performance.');
            return;
        }
        const durable = queue('attempts', attempt);
        cache();
        refresh();
        if (!durable)
            status('Browser storage is full. Keep this page open until cloud sync succeeds.', true);
        void sync();
    }
    async function savePaper(paper) {
        if (!owner) return showLoginPlaceholder();
        const user = owner;
        if (!savedPapers.some((item) => String(item.id) === String(paper.id)))
            savedPapers.unshift(structuredClone(paper));
        const durable = queue('papers', paper);
        cache();
        refresh();
        await sync();
        if (owner !== user) return;
        const synced = !outbox(user).some((op) => op.kind === 'papers' && op.id === String(paper.id));
        toast(
            synced
                ? 'Paper saved to My Papers on your account.'
                : durable
                  ? 'Paper saved on this device; cloud sync is pending. Check Settings.'
                  : 'Not saved yet. Keep this page open and retry sync in Settings.',
        );
    }
    async function removePaper(paper) {
        if (!owner) return showLoginPlaceholder();
        const user = owner;
        const durable = queue('papers', paper, true);
        savedPapers = savedPapers.filter((item) => String(item.id) !== String(paper.id));
        cache();
        refresh();
        await sync();
        if (owner !== user) return;
        const synced = !outbox(user).some((op) => op.kind === 'papers' && op.id === String(paper.id));
        toast(
            synced
                ? 'Paper deleted from My Papers.'
                : durable
                  ? 'Deletion saved on this device; waiting to sync.'
                  : 'Deletion is not saved yet. Keep this page open.',
        );
    }
    window.addEventListener('online', () => sync());
    window.addEventListener('focus', () => {
        if (owner) void sync();
    });
    window.addEventListener('storage', (event) => {
        if (owner && event.key === queueKey(owner)) void sync();
    });
    return { activate, sync, cache, refresh, saveAttempt, savePaper, removePaper };
})();

// Hook existing UI actions without changing the page layout or animation logic.
function persist() {
    const success = ExamStore.cache();
    ExamStore.refresh();
    return success;
}
function saveCurrentPaper() {
    if (!activePaper) return toast('Generate a paper first.');
    return authUser ? ExamStore.savePaper(activePaper) : openAuth('login', activePaper);
}
// EDIT: Save an online MCQ paper, separately from its automatic score/history save.
// Reuse the test ID from live state or history; keep the running timer/answers intact.
function saveTestPaper() {
    const record = testRunning ? { ...currentTestMeta, questions: testQuestions } : reviewData;
    if (!record?.id || !record.questions?.length) return toast('Start or review a test first.');
    return ExamStore.savePaper({
        id: 'mcq-' + record.id,
        subject: record.subject,
        date: record.startedAt || record.date,
        duration: record.duration ?? '—', // Older history did not record the allotted time.
        marks: record.questions.length, // Existing MCQ scoring: one mark per question.
        difficulty: 'Balanced',
        counts: [record.questions.length, 0, 0, 0, 0],
        source: record.source,
        materialKind: record.materialKind || null,
        filename: record.filename || 'Saved MCQ test',
        sections: [
            {
                type: 'MCQ',
                questions: record.questions.map((question, index) => ({
                    number: index + 1,
                    text: question.q,
                    options: [...question.o],
                    answer: question.o[question.a],
                    source:
                        question.source ||
                        (record.source === 'topic' ? 'Topic practice' : 'Not recorded'),
                })),
            },
        ],
    });
}
function deletePaper(index) {
    const paper = savedPapers[index];
    if (!paper) return;
    modal(
        'Delete this paper?',
        'Remove this paper from My Papers on your account?',
        () => ExamStore.removePaper(paper),
        'Delete Paper',
    );
}
function openSavedPdf(index) {
    const paper = savedPapers[index];
    if (!paper) return;
    activePaper = structuredClone(paper);
    generatedDraftKey = null;
    updatePreview();
    downloadPaper(false); // Same stored content; no Gemini request or regeneration.
}

// STARTUP: run only after every UI and storage function has been defined.
showFullPreview();
// Let Supabase consume email confirmation/recovery fragments before routing them.
if (!/(?:^#|&)(?:access_token|refresh_token|type|error|error_code|error_description)=/.test(location.hash)) {
    initializeNavigation();
}
initializeAuth();
