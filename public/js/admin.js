// ==========================================
// GUARD — redirect non-admins immediately
// (requireAdmin & showAdminNavLink from auth-utils.js)
// ==========================================
requireAdmin();
showAdminNavLink();

// ==========================================
// AUTH HELPERS
// ==========================================
function getToken()    { return localStorage.getItem("token"); }
function authHeaders() { return { "Authorization": `Bearer ${getToken()}`, "Content-Type": "application/json" }; }
function handleUnauth(status) {
    if (status === 401) { localStorage.removeItem("token"); window.location.href = "/auth/login"; return true; }
    return false;
}
function logout() {
    fetch("/api/auth/logout", { method: "POST", headers: authHeaders() }).catch(()=>{});
    localStorage.removeItem("token");
    window.location.href = "/auth/login";
}

document.getElementById("logoutBtn").addEventListener("click", logout);

// ==========================================
// LOAD STATS
// ==========================================
async function loadStats() {
    try {
        const res = await fetch("/api/admin", { headers: authHeaders() });
        if (handleUnauth(res.status)) return;
        if (!res.ok) return;
        const json = await res.json();
        const counts = json.data || json;
        document.getElementById("totalProblems").textContent    = counts.totalProblems    ?? "—";
        document.getElementById("totalContests").textContent    = counts.totalContests    ?? "—";
        document.getElementById("totalUsers").textContent       = counts.totalUsers       ?? "—";
        document.getElementById("totalSubmissions").textContent = counts.totalSubmissions ?? "—";
    } catch(e) { console.error(e); }
}

loadStats();
