// GUARD
requireAdmin();
showAdminNavLink();

// AUTH
function getToken()    { return localStorage.getItem("token"); }
function authHeaders() { return { "Authorization": `Bearer ${getToken()}`, "Content-Type": "application/json" }; }
function handleUnauth(status) {
    if (status === 401) { localStorage.removeItem("token"); window.location.href = "/auth/login"; return true; }
    return false;
}
if (!getToken()) window.location.href = "/auth/login";
document.getElementById("logoutBtn").addEventListener("click", () => {
    fetch("/api/auth/logout",{method:"POST",headers:authHeaders()}).catch(()=>{});
    localStorage.removeItem("token"); window.location.href="/auth/login";
});

// DOM
const tableBody       = document.getElementById("submissionTableBody");
const searchInput     = document.getElementById("searchInput");
const refreshBtn      = document.getElementById("refreshBtn");
const submissionCount = document.getElementById("submissionCount");

let allSubmissions = [];

function escapeHtml(s) {
    return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"})
        + " " + d.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});
}

function verdictClass(verdict) {
    if (!verdict) return "verdict-other";
    const v = verdict.toLowerCase();
    if (v === "accepted")               return "verdict-accepted";
    if (v.includes("wrong"))            return "verdict-wrong";
    if (v.includes("time"))             return "verdict-tle";
    if (v.includes("memory"))          return "verdict-mle";
    if (v.includes("runtime"))         return "verdict-re";
    if (v.includes("compilation") || v.includes("compile")) return "verdict-ce";
    return "verdict-other";
}

// LOAD
async function loadSubmissions() {
    tableBody.innerHTML = `<tr><td colspan="8" class="loading-row"><div class="spinner"></div>Loading...</td></tr>`;
    try {
        const res = await fetch("/api/admin/submissions", { headers: authHeaders() });
        if (handleUnauth(res.status)) return;
        const json = await res.json();
        if (!res.ok) { tableBody.innerHTML=`<tr><td colspan="8" class="loading-row">${json.message||"Error"}</td></tr>`; return; }
        allSubmissions = json.data || json;
        renderSubmissions(allSubmissions);
    } catch(e) {
        tableBody.innerHTML = `<tr><td colspan="8" class="loading-row">Network error</td></tr>`;
    }
}

function renderSubmissions(subs) {
    submissionCount.textContent = subs.length ? `Showing ${subs.length} submission${subs.length!==1?"s":""}` : "";
    if (!subs.length) { tableBody.innerHTML=`<tr><td colspan="8" class="loading-row">No submissions found.</td></tr>`; return; }
    tableBody.innerHTML = subs.map(s => `
        <tr>
            <td style="color:#475569;font-weight:600">#${s.submission_id}</td>
            <td style="font-weight:600;color:#818cf8">${escapeHtml(s.username)}</td>
            <td style="color:#e2e8f0">${escapeHtml(s.problem_title)}</td>
            <td><span style="background:rgba(99,102,241,0.1);color:#818cf8;padding:3px 8px;border-radius:6px;font-size:0.78rem;font-weight:600">${escapeHtml(s.language)}</span></td>
            <td><span class="verdict-badge ${verdictClass(s.verdict)}">${escapeHtml(s.verdict||"Pending")}</span></td>
            <td>${s.execution_time != null ? s.execution_time + " ms" : "—"}</td>
            <td>${s.memory_used != null ? s.memory_used + " MB" : "—"}</td>
            <td style="color:#64748b;font-size:0.82rem">${formatDate(s.submitted_at)}</td>
        </tr>
    `).join("");
}

// SEARCH
searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    renderSubmissions(q
        ? allSubmissions.filter(s =>
            (s.username||"").toLowerCase().includes(q) ||
            (s.problem_title||"").toLowerCase().includes(q) ||
            (s.verdict||"").toLowerCase().includes(q))
        : allSubmissions);
});

refreshBtn.addEventListener("click", loadSubmissions);
loadSubmissions();
