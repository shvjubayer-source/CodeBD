const CONTESTS_API = "/api/contests";

const contestGrid    = document.getElementById("contestGrid");
const contestCount   = document.getElementById("contestCount");
const totalEl        = document.getElementById("totalContests");
const upcomingEl     = document.getElementById("upcomingCount");
const ongoingEl      = document.getElementById("ongoingCount");
const pastEl         = document.getElementById("pastCount");
const logoutBtn      = document.getElementById("logoutBtn");

// Modals
const contestModal          = document.getElementById("contestModal");
const closeContestModalBtn  = document.getElementById("closeContestModalBtn");
const closeModalFooterBtn   = document.getElementById("closeModalFooterBtn");
const modalStatusBadge      = document.getElementById("modalStatusBadge");
const modalContestTitle     = document.getElementById("modalContestTitle");
const modalContestDesc      = document.getElementById("modalContestDesc");
const modalStartTime        = document.getElementById("modalStartTime");
const modalEndTime          = document.getElementById("modalEndTime");
const modalParticipants     = document.getElementById("modalParticipants");
const modalProblemCount     = document.getElementById("modalProblemCount");
const modalProblemList      = document.getElementById("modalProblemList");
const modalActionArea       = document.getElementById("modalActionArea");

const standingsModal        = document.getElementById("standingsModal");
const closeStandingsModalBtn= document.getElementById("closeStandingsModalBtn");
const closeStandingsFooterBtn= document.getElementById("closeStandingsFooterBtn");
const standingsContestTitle = document.getElementById("standingsContestTitle");
const standingsTableBody    = document.getElementById("standingsTableBody");

let allContests = [];
let currentFilter = "all";

// Enforce authentication on contest page
const token = localStorage.getItem("token");
if (!token) {
    window.location.href = "/auth/login";
} else {
    showAdminNavLink();
}


/* ─── Classify contest status ─── */
function getStatus(contest) {
    const now       = new Date();
    const startTime = new Date(contest.start_time);
    const endTime   = contest.end_time ? new Date(contest.end_time) : null;

    if (now < startTime) return "upcoming";
    if (endTime && now > endTime) return "past";
    return "ongoing";
}


/* ─── Format date/time ─── */
function formatDateTime(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}


/* ─── Time remaining countdown string ─── */
function timeUntil(dateStr) {
    const now  = new Date();
    const then = new Date(dateStr);
    const diffMs = then - now;

    if (diffMs <= 0) return null;

    const h = Math.floor(diffMs / 3_600_000);
    const m = Math.floor((diffMs % 3_600_000) / 60_000);

    if (h >= 24) {
        const days = Math.floor(h / 24);
        return `${days}d ${h % 24}h remaining`;
    }

    return `${h}h ${m}m remaining`;
}


/* ─── Create a contest card DOM element ─── */
function createContestCard(contest) {
    const status      = getStatus(contest);
    const isLoggedIn  = !!token;
    const isRegistered = Boolean(contest.is_registered);

    const card = document.createElement("div");
    card.className = "contest-card";
    card.dataset.status = status;

    const statusLabels = {
        upcoming: "Upcoming",
        ongoing:  "Ongoing",
        past:     "Past"
    };

    const startStr   = formatDateTime(contest.start_time);
    const endStr     = contest.end_time ? formatDateTime(contest.end_time) : "Open-ended";
    const remaining  = status === "upcoming" ? timeUntil(contest.start_time) : null;
    const participantCount = Number(contest.participant_count) || 0;

    // Action buttons depending on state
    let actionButtons = "";

    if (status === "upcoming") {
        if (!isLoggedIn) {
            actionButtons = `
                <a href="/auth/login" class="btn-register" style="text-align:center;text-decoration:none">Login to Register</a>
                <button class="btn-view" data-action="details" data-id="${contest.contest_id}">Details</button>
            `;
        } else if (isRegistered) {
            actionButtons = `
                <button class="btn-registered">✓ Registered</button>
                <button class="btn-view" data-action="details" data-id="${contest.contest_id}">Details</button>
            `;
        } else {
            actionButtons = `
                <button class="btn-register" data-action="register" data-id="${contest.contest_id}">Register</button>
                <button class="btn-view" data-action="details" data-id="${contest.contest_id}">Details</button>
            `;
        }
    } else if (status === "ongoing") {
        if (!isLoggedIn) {
            actionButtons = `
                <a href="/auth/login" class="btn-register" style="text-align:center;text-decoration:none">Login to Join</a>
                <button class="btn-standings" data-action="standings" data-id="${contest.contest_id}">🏆 Standings</button>
            `;
        } else if (isRegistered) {
            actionButtons = `
                <button class="btn-register" data-action="enter" data-id="${contest.contest_id}">🚀 Enter Contest</button>
                <button class="btn-standings" data-action="standings" data-id="${contest.contest_id}">🏆 Standings</button>
            `;
        } else {
            actionButtons = `
                <button class="btn-register" data-action="register" data-id="${contest.contest_id}">Register & Join</button>
                <button class="btn-standings" data-action="standings" data-id="${contest.contest_id}">🏆 Standings</button>
            `;
        }
    } else { // past
        actionButtons = `
            <button class="btn-standings" data-action="standings" data-id="${contest.contest_id}">🏆 Standings</button>
            <button class="btn-view" data-action="details" data-id="${contest.contest_id}">Problems</button>
        `;
    }

    card.innerHTML = `
        <div class="contest-card-top">
            <span class="status-badge status-${status}">${statusLabels[status]}</span>
            <span class="contest-id">#${contest.contest_id}</span>
        </div>

        <h3 style="cursor:pointer;" data-action="details" data-id="${contest.contest_id}">${escapeHtml(contest.title)}</h3>

        ${contest.description
            ? `<p class="contest-desc">${escapeHtml(contest.description)}</p>`
            : ""}

        <div class="contest-meta">
            <div class="contest-meta-row">
                <span>📅</span>
                <span>Start: ${startStr}</span>
            </div>
            <div class="contest-meta-row">
                <span>🏁</span>
                <span>End: ${endStr}</span>
            </div>
            ${remaining
                ? `<div class="contest-meta-row"><span>⏱</span><span>${remaining}</span></div>`
                : ""}
        </div>

        <div class="participant-info">
            <span>👥</span>
            <span>${participantCount} ${participantCount === 1 ? 'coder' : 'coders'} registered</span>
        </div>

        <div class="contest-actions">
            ${actionButtons}
        </div>
    `;

    // Attach click events on buttons inside card
    card.querySelectorAll("[data-action]").forEach(el => {
        el.addEventListener("click", e => {
            e.stopPropagation();
            const action = el.dataset.action;
            const cid = Number(el.dataset.id);
            if (action === "register") {
                registerForContest(cid, el);
            } else if (action === "enter" || action === "details") {
                openContestModal(cid);
            } else if (action === "standings") {
                openStandingsModal(cid);
            }
        });
    });

    return card;
}


/* ─── HTML escape helper ─── */
function escapeHtml(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}


/* ─── Register for contest ─── */
async function registerForContest(contestId, btn) {
    if (!token) {
        window.location.href = "/auth/login";
        return;
    }

    btn.disabled = true;
    btn.textContent = "Registering...";

    try {
        const res = await fetch(`${CONTESTS_API}/${contestId}/register`, {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem("token");
            window.location.href = "/auth/login";
            return;
        }

        const data = await res.json();

        if (res.ok) {
            btn.className = "btn-registered";
            btn.textContent = "✓ Registered";
            btn.disabled = true;
            // Refresh contest list to update participant count and registered state
            await loadContests();
        } else {
            btn.disabled = false;
            btn.textContent = "Register";
            alert(data.message || "Registration failed");
        }
    } catch (err) {
        console.error(err);
        btn.disabled = false;
        btn.textContent = "Register";
        alert("Failed to register. Please check connection.");
    }
}


/* ─── Open Contest Details & Problems Modal ─── */
async function openContestModal(contestId) {
    contestModal.classList.remove("hidden");
    modalProblemList.innerHTML = `<p class="list-message">Loading problems...</p>`;
    modalActionArea.innerHTML = "";

    try {
        const res = await fetch(`${CONTESTS_API}/${contestId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem("token");
            window.location.href = "/auth/login";
            return;
        }
        if (!res.ok) throw new Error("Could not fetch contest");
        const contest = await res.json();

        const status = getStatus(contest);
        const statusLabels = { upcoming: "Upcoming", ongoing: "Ongoing", past: "Past" };

        modalStatusBadge.className = `status-badge status-${status}`;
        modalStatusBadge.textContent = statusLabels[status];
        modalContestTitle.textContent = contest.title;
        modalContestDesc.textContent = contest.description || "No description provided.";
        modalStartTime.textContent = formatDateTime(contest.start_time);
        modalEndTime.textContent = contest.end_time ? formatDateTime(contest.end_time) : "Open-ended";
        
        // Find cached contest object for participant count and registered status
        const cached = allContests.find(c => c.contest_id === contestId);
        modalParticipants.textContent = cached ? (cached.participant_count || 0) : "0";

        const problems = contest.problems || [];
        modalProblemCount.textContent = `${problems.length} problems`;

        if (problems.length === 0) {
            modalProblemList.innerHTML = `<p class="list-message">No problems added to this contest yet.</p>`;
        } else {
            modalProblemList.innerHTML = problems.map((p, idx) => {
                const label = p.problem_label || String.fromCharCode(65 + idx);
                const diff = (p.difficulty || "Easy").toLowerCase();
                return `
                    <div class="contest-problem-row">
                        <div class="prob-left">
                            <span class="prob-order-badge">${label}</span>
                            <span class="prob-title">${escapeHtml(p.title)}</span>
                        </div>
                        <div class="prob-right">
                            <span class="prob-diff diff-${diff}">${escapeHtml(p.difficulty)}</span>
                            <span class="prob-points">${p.points || 100} pts</span>
                            <a href="/problems/${p.problem_id}" class="btn-solve">Solve</a>
                        </div>
                    </div>
                `;
            }).join("");
        }

        // Action button in modal footer
        if (status === "ongoing" || status === "past") {
            modalActionArea.innerHTML = `
                <button type="button" class="btn-standings" id="modalStandingsBtn">
                    🏆 View Standings
                </button>
            `;
            const mStandingsBtn = document.getElementById("modalStandingsBtn");
            if (mStandingsBtn) {
                mStandingsBtn.addEventListener("click", () => {
                    closeContestModal();
                    openStandingsModal(contestId);
                });
            }
        } else if (status === "upcoming" && cached && !cached.is_registered && token) {
            modalActionArea.innerHTML = `
                <button type="button" class="btn-register" id="modalRegisterBtn">
                    Register for Contest
                </button>
            `;
            const mRegBtn = document.getElementById("modalRegisterBtn");
            if (mRegBtn) {
                mRegBtn.addEventListener("click", async () => {
                    await registerForContest(contestId, mRegBtn);
                    modalActionArea.innerHTML = `<button class="btn-registered">✓ Registered</button>`;
                });
            }
        }
    } catch (err) {
        console.error(err);
        modalProblemList.innerHTML = `<p class="list-message error">Failed to load contest details.</p>`;
    }
}

function closeContestModal() {
    contestModal.classList.add("hidden");
}
closeContestModalBtn.addEventListener("click", closeContestModal);
closeModalFooterBtn.addEventListener("click", closeContestModal);
contestModal.addEventListener("click", e => {
    if (e.target === contestModal) closeContestModal();
});


/* ─── Open Standings / Leaderboard Modal ─── */
async function openStandingsModal(contestId) {
    standingsModal.classList.remove("hidden");
    standingsTableBody.innerHTML = `<tr><td colspan="6" class="list-message">Loading leaderboard...</td></tr>`;

    const contest = allContests.find(c => c.contest_id === contestId);
    if (contest) {
        standingsContestTitle.textContent = `${contest.title} — Standings`;
    }

    try {
        const res = await fetch(`${CONTESTS_API}/${contestId}/ranking`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem("token");
            window.location.href = "/auth/login";
            return;
        }
        if (!res.ok) throw new Error("Could not fetch standings");
        const rankings = await res.json();

        if (!rankings || rankings.length === 0) {
            standingsTableBody.innerHTML = `<tr><td colspan="6" class="list-message">No participants have submitted solutions yet.</td></tr>`;
            return;
        }

        standingsTableBody.innerHTML = rankings.map((r, idx) => {
            const rank = idx + 1;
            const rankClass = rank === 1 ? "rank-1" : rank === 2 ? "rank-2" : rank === 3 ? "rank-3" : "";
            const medal = rank === 1 ? "🥇 " : rank === 2 ? "🥈 " : rank === 3 ? "🥉 " : "";
            
            let ratingChangeBadge = "—";
            if (r.rating_change > 0) {
                ratingChangeBadge = `<span class="rating-up">+${r.rating_change}</span>`;
            } else if (r.rating_change < 0) {
                ratingChangeBadge = `<span class="rating-down">${r.rating_change}</span>`;
            }

            return `
                <tr>
                    <td class="rank-badge ${rankClass}">${medal}#${rank}</td>
                    <td><strong>${escapeHtml(r.username)}</strong></td>
                    <td>${r.solve_count || 0}</td>
                    <td style="font-weight:700;color:#4f46e5">${r.score || 0}</td>
                    <td style="color:#64748b">${r.penalty || 0}m</td>
                    <td>${ratingChangeBadge}</td>
                </tr>
            `;
        }).join("");
    } catch (err) {
        console.error(err);
        standingsTableBody.innerHTML = `<tr><td colspan="6" class="list-message error">Failed to load standings.</td></tr>`;
    }
}

function closeStandingsModal() {
    standingsModal.classList.add("hidden");
}
closeStandingsModalBtn.addEventListener("click", closeStandingsModal);
closeStandingsFooterBtn.addEventListener("click", closeStandingsModal);
standingsModal.addEventListener("click", e => {
    if (e.target === standingsModal) closeStandingsModal();
});


/* ─── Render contests ─── */
function renderContests(contests) {
    contestGrid.replaceChildren();
    contestCount.textContent = contests.length;

    if (contests.length === 0) {
        const msg = document.createElement("p");
        msg.className = "list-message";
        msg.textContent = "No contests found in this category.";
        contestGrid.append(msg);
        return;
    }

    const frag = document.createDocumentFragment();
    contests.forEach(c => frag.append(createContestCard(c)));
    contestGrid.append(frag);
}


/* ─── Apply filter ─── */
function applyFilter(filter) {
    currentFilter = filter;

    const filtered = filter === "all"
        ? allContests
        : allContests.filter(c => getStatus(c) === filter);

    renderContests(filtered);
}


/* ─── Update stats bar ─── */
function updateStats() {
    const counts = { upcoming: 0, ongoing: 0, past: 0 };
    allContests.forEach(c => {
        const s = getStatus(c);
        if (counts[s] !== undefined) counts[s]++;
    });

    totalEl.textContent    = allContests.length;
    upcomingEl.textContent = counts.upcoming;
    ongoingEl.textContent  = counts.ongoing;
    pastEl.textContent     = counts.past;
}


async function loadContests() {
    if (!token) {
        window.location.href = "/auth/login";
        return;
    }

    try {
        const res = await fetch(CONTESTS_API, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem("token");
            window.location.href = "/auth/login";
            return;
        }

        if (!res.ok) throw new Error(`API error: ${res.status}`);

        allContests = await res.json();

        updateStats();
        applyFilter(currentFilter);
    } catch (err) {
        console.error("Could not load contests:", err);
        contestGrid.innerHTML = `<p class="list-message error">Could not load contests. Please refresh the page.</p>`;
    }
}


/* ─── Tab switching ─── */
document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        applyFilter(tab.dataset.filter);
    });
});


/* ─── Logout ─── */
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("token");
        window.location.href = "/auth/login";
    });
}


/* ─── Boot ─── */
loadContests();
