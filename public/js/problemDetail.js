const PROBLEMS_API   = "/api/problems";
const BOOKMARKS_API  = "/api/bookmarks";
const SUBMISSIONS_API = "/api/submissions";
const TOKEN_KEY      = "token";

// ── Get problem ID from URL (/problems/5) ──────────────────────────────────────
const pathParts = window.location.pathname.split("/");
const problemId = pathParts[pathParts.length - 1];

const token = localStorage.getItem(TOKEN_KEY);

// Elements
const loadingState   = document.getElementById("loadingState");
const errorState     = document.getElementById("errorState");
const problemContent = document.getElementById("problemContent");
const breadcrumbTitle = document.getElementById("breadcrumbTitle");

const problemNumber  = document.getElementById("problemNumber");
const difficultyBadge = document.getElementById("difficultyBadge");
const verdictBadge   = document.getElementById("verdictBadge");
const problemTitle   = document.getElementById("problemTitle");
const bookmarkBtn    = document.getElementById("bookmarkBtn");
const bookmarkIcon   = document.getElementById("bookmarkIcon");
const bookmarkText   = document.getElementById("bookmarkText");
const timeLimit      = document.getElementById("timeLimit");
const memoryLimit    = document.getElementById("memoryLimit");
const tagsRow        = document.getElementById("tagsRow");
const statementBody  = document.getElementById("statementBody");

const submitForm     = document.getElementById("submitForm");
const languageSelect = document.getElementById("languageSelect");
const codeTextarea   = document.getElementById("codeTextarea");
const submitBtn      = document.getElementById("submitBtn");
const submitBtnText  = document.getElementById("submitBtnText");
const submitMessage  = document.getElementById("submitMessage");
const clearCodeBtn   = document.getElementById("clearCodeBtn");
const langLabel      = document.getElementById("langLabel");

const logoutBtn      = document.getElementById("logoutBtn");

let currentProblem = null;


// ── Boot ──────────────────────────────────────────────────────────────────────
if (!token) {
    window.location.href = "/auth/login";
} else {
    showAdminNavLink();
    loadProblem();
}


// ── Load Problem ──────────────────────────────────────────────────────────────
async function loadProblem() {
    try {
        const res = await fetch(`${PROBLEMS_API}/${problemId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem(TOKEN_KEY);
            window.location.href = "/auth/login";
            return;
        }

        if (res.status === 404) {
            showError();
            return;
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const problem = await res.json();
        currentProblem = problem;

        renderProblem(problem);
    } catch (err) {
        console.error("Error loading problem:", err);
        showError();
    }
}


// ── Render Problem ────────────────────────────────────────────────────────────
function renderProblem(problem) {
    // Page title
    document.title = `${problem.title} | CodeBD`;

    // Breadcrumb
    breadcrumbTitle.textContent = problem.title;

    // Header
    problemNumber.textContent = `#${problem.problem_id}`;
    problemTitle.textContent  = problem.title;

    // Difficulty badge
    const diff = (problem.difficulty || "").toLowerCase();
    difficultyBadge.textContent = capitalize(diff);
    difficultyBadge.className   = `difficulty-badge ${diff}`;

    // Verdict badge
    if (problem.verdict) {
        const v = (problem.verdict || "").toLowerCase();
        verdictBadge.textContent = problem.verdict;
        verdictBadge.className   = `verdict-badge ${v === "accepted" ? "accepted" : "wrong"}`;
        verdictBadge.classList.remove("hidden");
    }

    // Bookmark button
    updateBookmarkButton(problem.is_bookmarked);

    // Constraints
    timeLimit.textContent   = problem.time_limit   ? `${problem.time_limit}s` : "—";
    memoryLimit.textContent = problem.memory_limit ? `${problem.memory_limit} MB` : "—";

    // Tags
    if (problem.tags) {
        const tagList = problem.tags.split(",").map(t => t.trim()).filter(Boolean);
        tagsRow.replaceChildren();
        tagList.forEach(tag => {
            const chip = document.createElement("span");
            chip.className = "tag-chip";
            chip.textContent = tag;
            tagsRow.append(chip);
        });
    }

    // Statement
    statementBody.textContent = problem.statement || "No statement provided.";

    // Show content
    loadingState.style.display = "none";
    problemContent.classList.remove("hidden");
}


// ── Bookmark Toggle ───────────────────────────────────────────────────────────
function updateBookmarkButton(isBookmarked) {
    bookmarkIcon.textContent = isBookmarked ? "★" : "☆";
    bookmarkText.textContent = isBookmarked ? "Saved" : "Save";
    bookmarkBtn.classList.toggle("bookmarked", isBookmarked);
    bookmarkBtn.setAttribute("aria-pressed", String(isBookmarked));
}

bookmarkBtn.addEventListener("click", async () => {
    if (!currentProblem) return;

    const wasBookmarked = currentProblem.is_bookmarked;
    bookmarkBtn.disabled = true;

    try {
        const res = await fetch(`${BOOKMARKS_API}/${problemId}`, {
            method: wasBookmarked ? "DELETE" : "POST",
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Bookmark request failed");

        currentProblem.is_bookmarked = !wasBookmarked;
        updateBookmarkButton(currentProblem.is_bookmarked);
    } catch (err) {
        console.error("Bookmark error:", err);
    } finally {
        bookmarkBtn.disabled = false;
    }
});


// ── Language label update ─────────────────────────────────────────────────────
languageSelect.addEventListener("change", () => {
    langLabel.textContent = languageSelect.value || "No language selected";
});


// ── Clear code ────────────────────────────────────────────────────────────────
clearCodeBtn.addEventListener("click", () => {
    codeTextarea.value = "";
    codeTextarea.focus();
});


// ── Tab key in textarea inserts spaces ────────────────────────────────────────
codeTextarea.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
        e.preventDefault();
        const start = codeTextarea.selectionStart;
        const end   = codeTextarea.selectionEnd;
        codeTextarea.value = codeTextarea.value.substring(0, start) + "    " + codeTextarea.value.substring(end);
        codeTextarea.selectionStart = codeTextarea.selectionEnd = start + 4;
    }
});


// ── Submit solution ───────────────────────────────────────────────────────────
submitForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const language = languageSelect.value.trim();
    const code     = codeTextarea.value.trim();

    if (!language) {
        showSubmitMessage("Please select a programming language.", "error");
        return;
    }

    if (!code) {
        showSubmitMessage("Please enter your source code.", "error");
        return;
    }

    submitBtn.disabled = true;
    submitBtnText.textContent = "Submitting...";
    hideSubmitMessage();

    try {
        const res = await fetch(SUBMISSIONS_API, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                problem_id: Number(problemId),
                language,
                code
            })
        });

        const data = await res.json();

        if (res.ok) {
            showSubmitMessage(
                `✓ Submission received! Status: ${data.submission.verdict || "Pending"}. <a href="/submissions">View all submissions →</a>`,
                "success"
            );
            codeTextarea.value = "";
        } else {
            showSubmitMessage(data.message || "Submission failed. Please try again.", "error");
        }
    } catch (err) {
        console.error("Submit error:", err);
        showSubmitMessage("Network error. Please try again.", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtnText.textContent = "Submit Solution";
    }
});


// ── Helpers ───────────────────────────────────────────────────────────────────
function showError() {
    loadingState.style.display = "none";
    errorState.classList.remove("hidden");
}

function showSubmitMessage(html, type) {
    submitMessage.innerHTML = html;
    submitMessage.className = `submit-message ${type}`;
    submitMessage.classList.remove("hidden");
}

function hideSubmitMessage() {
    submitMessage.classList.add("hidden");
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = "/auth/login";
});
