const BOOKMARKS_API = "/api/bookmarks";
const TOKEN_KEY = "token";

const token = localStorage.getItem(TOKEN_KEY);

// Elements
const bookmarkList  = document.getElementById("bookmarkList");
const bookmarkCount = document.getElementById("bookmarkCount");
const solvedCount   = document.getElementById("solvedCount");
const unsolvedCount = document.getElementById("unsolvedCount");
const displayCount  = document.getElementById("displayCount");
const logoutBtn     = document.getElementById("logoutBtn");

let allBookmarks = [];


// ── Boot ──────────────────────────────────────────────────────────────────────
if (!token) {
    window.location.href = "/auth/login";
} else {
    showAdminNavLink();
    loadBookmarks();
}


// ── Load bookmarks ────────────────────────────────────────────────────────────
async function loadBookmarks() {
    try {
        const res = await fetch(BOOKMARKS_API, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem(TOKEN_KEY);
            window.location.href = "/auth/login";
            return;
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        allBookmarks = await res.json();

        updateStats();
        renderBookmarks();
    } catch (err) {
        console.error("Error loading bookmarks:", err);
        bookmarkList.innerHTML = `<p class="list-message error" style="color:#ef4444;">Could not load bookmarks. Please refresh.</p>`;
    }
}


// ── Update stats ──────────────────────────────────────────────────────────────
function updateStats() {
    const solved = allBookmarks.filter(b => b.verdict === "Accepted").length;
    bookmarkCount.textContent = allBookmarks.length;
    solvedCount.textContent   = solved;
    unsolvedCount.textContent = allBookmarks.length - solved;
    displayCount.textContent  = allBookmarks.length;
}


// ── Render bookmarks ──────────────────────────────────────────────────────────
function renderBookmarks() {
    bookmarkList.replaceChildren();

    if (allBookmarks.length === 0) {
        bookmarkList.innerHTML = `
            <div class="empty-state">
                <p class="empty-icon">🔖</p>
                <h3>No Bookmarks Yet</h3>
                <p>Save problems from the Problems page to see them here.</p>
                <a href="/problems" class="btn-browse">Browse Problems</a>
            </div>
        `;
        return;
    }

    const frag = document.createDocumentFragment();
    allBookmarks.forEach(b => frag.append(createBookmarkCard(b)));
    bookmarkList.append(frag);
}


// ── Create bookmark card ──────────────────────────────────────────────────────
function createBookmarkCard(problem) {
    const card = document.createElement("div");
    card.className = "bookmark-card";
    card.id = `bm-card-${problem.problem_id}`;

    const verdict = (problem.verdict || "").toLowerCase();
    if (verdict === "accepted") card.classList.add("is-accepted");
    else if (verdict !== "") card.classList.add("is-wrong-answer");

    const diff   = (problem.difficulty || "").toLowerCase();
    const tagList = problem.tags
        ? problem.tags.split(",").map(t => t.trim()).filter(Boolean)
        : [];

    const tagChips = tagList
        .map(t => `<span class="tag-chip">${escapeHtml(t)}</span>`)
        .join("");

    let verdictHtml = "";
    if (problem.verdict) {
        const cls = verdict === "accepted" ? "accepted" : "wrong";
        verdictHtml = `<span class="verdict-badge ${cls}">${escapeHtml(problem.verdict)}</span>`;
    }

    card.innerHTML = `
        <div class="card-body">
            <div class="card-top">
                <span class="problem-num">#${problem.problem_id}</span>
                <span class="difficulty-badge ${diff}">${capitalize(diff)}</span>
                ${verdictHtml}
            </div>
            <a href="/problems/${problem.problem_id}" class="card-title">${escapeHtml(problem.title)}</a>
            <p class="card-statement">${escapeHtml(problem.statement || "")}</p>
            ${tagChips ? `<div class="card-tags">${tagChips}</div>` : ""}
        </div>
        <div class="card-actions">
            <a href="/problems/${problem.problem_id}" class="btn-solve">Solve →</a>
            <button class="btn-remove" data-id="${problem.problem_id}">Remove</button>
        </div>
    `;

    card.querySelector(".btn-remove").addEventListener("click", () =>
        removeBookmark(problem.problem_id, card)
    );

    return card;
}


// ── Remove bookmark ───────────────────────────────────────────────────────────
async function removeBookmark(problemId, card) {
    const btn = card.querySelector(".btn-remove");
    btn.disabled = true;
    btn.textContent = "Removing...";

    try {
        const res = await fetch(`${BOOKMARKS_API}/${problemId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Failed to remove bookmark");

        // Animate out
        card.style.transition = "opacity 0.3s, transform 0.3s";
        card.style.opacity = "0";
        card.style.transform = "translateX(20px)";

        setTimeout(() => {
            card.remove();
            allBookmarks = allBookmarks.filter(b => b.problem_id !== problemId);
            updateStats();

            if (allBookmarks.length === 0) {
                renderBookmarks(); // show empty state
            }
        }, 300);

    } catch (err) {
        console.error("Remove bookmark error:", err);
        btn.disabled = false;
        btn.textContent = "Remove";
    }
}


// ── Helpers ───────────────────────────────────────────────────────────────────
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = "/auth/login";
});
