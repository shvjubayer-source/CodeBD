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
const tableBody  = document.getElementById("userTableBody");
const messageEl  = document.getElementById("message");
const searchInput = document.getElementById("searchInput");
const refreshBtn  = document.getElementById("refreshBtn");
const userCount   = document.getElementById("userCount");

let allUsers = [];

function showMessage(text, type="success") {
    messageEl.textContent = text; messageEl.className=`message ${type}`;
    messageEl.classList.remove("hidden");
    clearTimeout(messageEl._t);
    messageEl._t = setTimeout(()=>messageEl.classList.add("hidden"), 4000);
}

function escapeHtml(s) {
    return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"});
}

// LOAD
async function loadUsers() {
    tableBody.innerHTML = `<tr><td colspan="7" class="loading-row"><div class="spinner"></div>Loading...</td></tr>`;
    try {
        const res = await fetch("/api/admin/users", { headers: authHeaders() });
        if (handleUnauth(res.status)) return;
        const json = await res.json();
        if (!res.ok) { tableBody.innerHTML=`<tr><td colspan="7" class="loading-row">${json.message||"Error"}</td></tr>`; return; }
        allUsers = json.data || json;
        renderUsers(allUsers);
    } catch(e) {
        tableBody.innerHTML = `<tr><td colspan="7" class="loading-row">Network error</td></tr>`;
    }
}

function renderUsers(users) {
    userCount.textContent = users.length ? `Showing ${users.length} user${users.length!==1?"s":""}` : "";
    if (!users.length) { tableBody.innerHTML=`<tr><td colspan="7" class="loading-row">No users found.</td></tr>`; return; }
    tableBody.innerHTML = users.map(u => `
        <tr>
            <td style="color:#475569;font-weight:600">#${u.user_id}</td>
            <td style="font-weight:600;color:#e2e8f0">${escapeHtml(u.username)}</td>
            <td style="color:#94a3b8">${escapeHtml(u.email)}</td>
            <td><span class="role-badge ${u.role}">${u.role}</span></td>
            <td style="color:#818cf8;font-weight:600">${u.rating}</td>
            <td>${formatDate(u.created_at)}</td>
            <td>
                ${u.role === "user"
                    ? `<button class="role-btn" data-id="${u.user_id}" data-role="admin">Make Admin</button>`
                    : `<button class="role-btn demote" data-id="${u.user_id}" data-role="user">Make User</button>`
                }
            </td>
        </tr>
    `).join("");
    attachEvents();
}

function attachEvents() {
    document.querySelectorAll(".role-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id   = btn.dataset.id;
            const role = btn.dataset.role;
            btn.disabled = true;
            try {
                const res = await fetch(`/api/admin/users/${id}/role`, {
                    method: "PUT", headers: authHeaders(),
                    body: JSON.stringify({ role })
                });
                if (handleUnauth(res.status)) return;
                const json = await res.json();
                if (!res.ok) { showMessage(json.message||"Failed","error"); return; }
                showMessage(`User role changed to "${role}".`);
                await loadUsers();
                await loadAuditLogs();
            } catch(e) { showMessage("Network error","error"); }
            finally { btn.disabled = false; }
        });
    });
}

// AUDIT LOGS (TRIGGER SHADOW LOG)
const auditTableBody = document.getElementById("auditTableBody");
const refreshAuditBtn = document.getElementById("refreshAuditBtn");

async function loadAuditLogs() {
    if (!auditTableBody) return;
    auditTableBody.innerHTML = `<tr><td colspan="8" class="loading-row"><div class="spinner"></div>Loading audit trail...</td></tr>`;
    try {
        const res = await fetch("/api/admin/audit-logs", { headers: authHeaders() });
        if (handleUnauth(res.status)) return;
        const json = await res.json();
        if (!res.ok) {
            auditTableBody.innerHTML = `<tr><td colspan="8" class="loading-row">${json.message || "Failed to load audit logs"}</td></tr>`;
            return;
        }
        const logs = json.data || [];
        renderAuditLogs(logs);
    } catch (e) {
        auditTableBody.innerHTML = `<tr><td colspan="8" class="loading-row">Network error loading audit logs</td></tr>`;
    }
}

function renderAuditLogs(logs) {
    if (!logs.length) {
        auditTableBody.innerHTML = `<tr><td colspan="8" class="loading-row">No audit logs recorded yet. Change a user role or rating to see the trigger in action!</td></tr>`;
        return;
    }
    auditTableBody.innerHTML = logs.map(l => `
        <tr>
            <td style="color:#475569;font-weight:600">#${l.audit_id}</td>
            <td style="font-weight:600;color:#e2e8f0">${escapeHtml(l.username)}</td>
            <td><span class="role-badge ${l.old_role || 'user'}">${l.old_role || '—'}</span></td>
            <td><span class="role-badge ${l.new_role || 'user'}">${l.new_role || '—'}</span></td>
            <td style="color:#94a3b8">${l.old_rating != null ? l.old_rating : '—'}</td>
            <td style="color:#818cf8;font-weight:600">${l.new_rating != null ? l.new_rating : '—'}</td>
            <td><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:600;background:rgba(59,130,246,0.15);color:#60a5fa;border:1px solid rgba(59,130,246,0.3);">${escapeHtml(l.action_type)}</span></td>
            <td style="color:#94a3b8;font-size:0.8rem">${new Date(l.changed_at).toLocaleString("en-US")}</td>
        </tr>
    `).join("");
}

if (refreshAuditBtn) {
    refreshAuditBtn.addEventListener("click", loadAuditLogs);
}

// SEARCH
searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    renderUsers(q ? allUsers.filter(u => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) : allUsers);
});

refreshBtn.addEventListener("click", loadUsers);
loadUsers();
loadAuditLogs();
