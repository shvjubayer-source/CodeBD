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
const acceptanceRate = document.getElementById("acceptanceRate");
const tagsRow        = document.getElementById("tagsRow");
const statementBody  = document.getElementById("statementBody");

// Tabs & Editorial Elements
const tabStatementBtn       = document.getElementById("tabStatementBtn");
const tabEditorialBtn       = document.getElementById("tabEditorialBtn");
const statementSection      = document.getElementById("statementSection");
const editorialSection      = document.getElementById("editorialSection");
const editorialBody         = document.getElementById("editorialBody");
const adminEditSolutionBtn  = document.getElementById("adminEditSolutionBtn");
const adminSolutionEditForm = document.getElementById("adminSolutionEditForm");
const adminSolutionTextarea = document.getElementById("adminSolutionTextarea");
const saveSolutionBtn       = document.getElementById("saveSolutionBtn");
const cancelSolutionBtn     = document.getElementById("cancelSolutionBtn");

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
    if (acceptanceRate) {
        acceptanceRate.textContent = problem.acceptance_rate != null ? `${problem.acceptance_rate}%` : "—";
    }

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


// ── Tab Switching ─────────────────────────────────────────────────────────────
tabStatementBtn.addEventListener("click", () => {
    tabStatementBtn.classList.add("active");
    tabEditorialBtn.classList.remove("active");
    statementSection.classList.remove("hidden");
    editorialSection.classList.add("hidden");
});

tabEditorialBtn.addEventListener("click", () => {
    tabEditorialBtn.classList.add("active");
    tabStatementBtn.classList.remove("active");
    editorialSection.classList.remove("hidden");
    statementSection.classList.add("hidden");
    loadEditorial();
});

let currentEditorial = null;

async function loadEditorial() {
    editorialBody.innerHTML = '<p style="color:#64748b;">Loading official editorial...</p>';
    try {
        const res = await fetch(`${PROBLEMS_API}/${problemId}/solution`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.status === 404) {
            currentEditorial = null;
            editorialBody.innerHTML = '<p style="color:#64748b;font-style:italic;">No official editorial has been published for this problem yet.</p>';
            if (typeof isAdmin === "function" && isAdmin()) {
                adminEditSolutionBtn.classList.remove("hidden");
                adminEditSolutionBtn.textContent = "+ Add Editorial";
            }
            return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        currentEditorial = data.content;
        renderEditorial(data.content);
        if (typeof isAdmin === "function" && isAdmin()) {
            adminEditSolutionBtn.classList.remove("hidden");
            adminEditSolutionBtn.textContent = "Edit Editorial";
        }
    } catch (err) {
        console.error("Error loading editorial:", err);
        editorialBody.innerHTML = '<p style="color:#dc2626;">Could not load editorial at this time.</p>';
    }
}

function renderEditorial(rawText) {
    if (!rawText) {
        editorialBody.innerHTML = '<p style="color:#64748b;">No editorial content.</p>';
        return;
    }
    const parts = rawText.split(/(```[\s\S]*?```)/g);
    let html = "";
    for (const part of parts) {
        if (part.startsWith("```") && part.endsWith("```")) {
            const firstLineBreak = part.indexOf("\n");
            let code = "";
            if (firstLineBreak !== -1) {
                code = part.substring(firstLineBreak + 1, part.length - 3);
            } else {
                code = part.substring(3, part.length - 3);
            }
            html += `<pre><code>${escapeHtml(code.trim())}</code></pre>`;
        } else {
            let formatted = escapeHtml(part)
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/`(.*?)`/g, '<code>$1</code>')
                .replace(/\n\n+/g, '<br><br>')
                .replace(/\n/g, '<br>');
            html += `<div>${formatted}</div>`;
        }
    }
    editorialBody.innerHTML = html;
}

if (adminEditSolutionBtn) {
    adminEditSolutionBtn.addEventListener("click", () => {
        adminSolutionTextarea.value = currentEditorial || "";
        adminSolutionEditForm.classList.remove("hidden");
        adminEditSolutionBtn.classList.add("hidden");
    });
}

if (cancelSolutionBtn) {
    cancelSolutionBtn.addEventListener("click", () => {
        adminSolutionEditForm.classList.add("hidden");
        adminEditSolutionBtn.classList.remove("hidden");
    });
}

if (saveSolutionBtn) {
    saveSolutionBtn.addEventListener("click", async () => {
        const content = adminSolutionTextarea.value.trim();
        if (!content) {
            alert("Editorial content cannot be empty.");
            return;
        }
        saveSolutionBtn.disabled = true;
        saveSolutionBtn.textContent = "Saving...";
        try {
            const res = await fetch(`${PROBLEMS_API}/${problemId}/solution`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ content })
            });
            if (!res.ok) throw new Error("Failed to save editorial");
            currentEditorial = content;
            renderEditorial(content);
            adminSolutionEditForm.classList.add("hidden");
            adminEditSolutionBtn.classList.remove("hidden");
            adminEditSolutionBtn.textContent = "Edit Editorial";
        } catch (err) {
            alert("Error saving editorial: " + err.message);
        } finally {
            saveSolutionBtn.disabled = false;
            saveSolutionBtn.textContent = "Save Editorial";
        }
    });
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
    if (!token) {
        window.location.href = "/auth/login";
        return;
    }

    const wasBookmarked = currentProblem.is_bookmarked;
    bookmarkBtn.disabled = true;

    try {
        const res = await fetch(`${BOOKMARKS_API}/${problemId}`, {
            method: wasBookmarked ? "DELETE" : "POST",
            headers: { Authorization: `Bearer ${token}` }
        });

        if (res.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            window.location.href = "/auth/login";
            return;
        }

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

    if (!token) {
        window.location.href = "/auth/login";
        return;
    }

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

        if (res.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            window.location.href = "/auth/login";
            return;
        }

        const data = await res.json();

        if (res.ok) {
            const sub = data.submission || {};
            const evalRes = data.evalResult || {};
            const verdict = sub.verdict || "Pending";

            if (verdict === "Accepted") {
                verdictBadge.textContent = "Accepted";
                verdictBadge.className = "verdict-badge accepted";
                verdictBadge.classList.remove("hidden");
                showSubmitMessage(
                    `🎉 <strong>Accepted!</strong> All test cases passed in ${sub.execution_time != null ? sub.execution_time + " ms" : ""}. <a href="/submissions">View all submissions →</a>`,
                    "success"
                );
            } else if (verdict === "Wrong Answer") {
                verdictBadge.textContent = "Wrong Answer";
                verdictBadge.className = "verdict-badge wrong";
                verdictBadge.classList.remove("hidden");
                showSubmitMessage(
                    `❌ <strong>Wrong Answer</strong>${evalRes.failedTestcase ? ` on test case #${evalRes.failedTestcase}` : ""}. <a href="/submissions">View all submissions →</a>`,
                    "error"
                );
            } else if (verdict === "Time Limit Exceeded") {
                verdictBadge.textContent = "Time Limit Exceeded";
                verdictBadge.className = "verdict-badge wrong";
                verdictBadge.classList.remove("hidden");
                showSubmitMessage(
                    `⏱ <strong>Time Limit Exceeded</strong>. Your solution exceeded the allowed time limit. <a href="/submissions">View all submissions →</a>`,
                    "warning"
                );
            } else if (verdict === "Runtime Error") {
                verdictBadge.textContent = "Runtime Error";
                verdictBadge.className = "verdict-badge wrong";
                verdictBadge.classList.remove("hidden");
                showSubmitMessage(
                    `⚠️ <strong>Runtime Error</strong>${evalRes.failedTestcase ? ` on test case #${evalRes.failedTestcase}` : ""}${evalRes.error ? `<pre style="margin-top:8px;font-size:0.8rem;white-space:pre-wrap;background:#1e1b4b;color:#f8fafc;padding:8px;border-radius:6px;overflow-x:auto">${escapeHtml(evalRes.error)}</pre>` : ""}. <a href="/submissions">View all submissions →</a>`,
                    "error"
                );
            } else if (verdict === "Compilation Error") {
                verdictBadge.textContent = "Compilation Error";
                verdictBadge.className = "verdict-badge wrong";
                verdictBadge.classList.remove("hidden");
                showSubmitMessage(
                    `⚠️ <strong>Compilation Error</strong>:<pre style="margin-top:8px;font-size:0.8rem;white-space:pre-wrap;background:#1e1b4b;color:#f8fafc;padding:8px;border-radius:6px;overflow-x:auto">${escapeHtml(evalRes.error || "Failed to compile")}</pre><a href="/submissions">View all submissions →</a>`,
                    "error"
                );
            } else {
                showSubmitMessage(
                    `Status: <strong>${verdict}</strong>. <a href="/submissions">View all submissions →</a>`,
                    "info"
                );
            }
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

function escapeHtml(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}


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
