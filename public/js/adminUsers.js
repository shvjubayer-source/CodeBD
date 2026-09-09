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
            } catch(e) { showMessage("Network error","error"); }
            finally { btn.disabled = false; }
        });
    });
}

// SEARCH
searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    renderUsers(q ? allUsers.filter(u => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) : allUsers);
});

refreshBtn.addEventListener("click", loadUsers);
loadUsers();
