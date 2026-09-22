// ==========================================
// GUARD
// ==========================================
requireAdmin();
showAdminNavLink();

// ==========================================
// AUTH
// ==========================================
function getToken()    { return localStorage.getItem("token"); }
function authHeaders() { return { "Authorization": `Bearer ${getToken()}`, "Content-Type": "application/json" }; }
function handleUnauth(status) {
    if (status === 401) { localStorage.removeItem("token"); window.location.href = "/auth/login"; return true; }
    return false;
}
if (!getToken()) window.location.href = "/auth/login";
document.getElementById("logoutBtn").addEventListener("click", () => {
    fetch("/api/auth/logout", { method: "POST", headers: authHeaders() }).catch(()=>{});
    localStorage.removeItem("token"); window.location.href = "/auth/login";
});

// ==========================================
// DOM
// ==========================================
const tableBody       = document.getElementById("contestTableBody");
const messageEl       = document.getElementById("message");
const createForm      = document.getElementById("createContestForm");
const createBtn       = document.getElementById("createContestBtn");
const toggleCreateBtn = document.getElementById("toggleCreateBtn");
const refreshBtn      = document.getElementById("refreshBtn");
const editModal       = document.getElementById("editModal");
const editForm        = document.getElementById("editContestForm");
const editBtn         = document.getElementById("editContestBtn");
const closeModalBtn   = document.getElementById("closeModalBtn");
const cancelEditBtn   = document.getElementById("cancelEditBtn");
const deleteModal     = document.getElementById("deleteModal");
const confirmDelBtn   = document.getElementById("confirmDeleteBtn");
const cancelDelBtn    = document.getElementById("cancelDeleteBtn");
const closeDeleteBtn  = document.getElementById("closeDeleteBtn");
const deleteTitle     = document.getElementById("deleteContestTitle");

let allContests = [];
let pendingDeleteId = null;

// ==========================================
// HELPERS
// ==========================================
function showMessage(text, type="success") {
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.classList.remove("hidden");
    clearTimeout(messageEl._t);
    messageEl._t = setTimeout(() => messageEl.classList.add("hidden"), 4000);
}

function escapeHtml(s) {
    return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { year:"numeric", month:"short", day:"numeric" })
        + " " + d.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" });
}

// Converts ISO string to datetime-local value
function toDatetimeLocal(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = n => String(n).padStart(2,"0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ==========================================
// LOAD CONTESTS
// ==========================================
async function loadContests() {
    tableBody.innerHTML = `<tr><td colspan="6" class="loading-row"><div class="spinner"></div>Loading...</td></tr>`;
    try {
        const res = await fetch("/api/admin/contests", { headers: authHeaders() });
        if (handleUnauth(res.status)) return;
        const json = await res.json();
        if (!res.ok) { tableBody.innerHTML = `<tr><td colspan="6" class="loading-row">${json.message||"Error"}</td></tr>`; return; }
        allContests = json.data || json;
        renderContests(allContests);
    } catch(e) {
        console.error(e);
        tableBody.innerHTML = `<tr><td colspan="6" class="loading-row">Network error</td></tr>`;
    }
}

function renderContests(contests) {
    if (!contests.length) { tableBody.innerHTML = `<tr><td colspan="6" class="loading-row">No contests found.</td></tr>`; return; }
    tableBody.innerHTML = contests.map(c => `
        <tr>
            <td style="color:#475569;font-weight:600">#${c.contest_id}</td>
            <td style="font-weight:600;color:#e2e8f0">${escapeHtml(c.title)}</td>
            <td style="color:#94a3b8;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(c.description||"—")}</td>
            <td>${formatDate(c.start_time)}</td>
            <td>
                <button class="btn-outline view-reg-btn" data-id="${c.contest_id}" style="padding:4px 10px;font-size:0.8rem;">
                    👥 ${c.participant_count || 0} Registered
                </button>
            </td>
            <td>
                <button class="edit-btn" data-id="${c.contest_id}">✏ Edit</button>
                <button class="delete-btn" data-id="${c.contest_id}" data-title="${escapeHtml(c.title)}">🗑 Delete</button>
            </td>
        </tr>
    `).join("");

    updateContestDropdown(contests);
    attachEvents();
}

function updateContestDropdown(contests) {
    const select = document.getElementById("filterContestSelect");
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = `<option value="">All Contests (${contests.length})</option>` +
        contests.map(c => `<option value="${c.contest_id}" ${currentVal === String(c.contest_id) ? 'selected' : ''}>${escapeHtml(c.title)} (#${c.contest_id})</option>`).join("");
}

function attachEvents() {
    document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const c = allContests.find(x => x.contest_id === Number(btn.dataset.id));
            if (c) openEditModal(c);
        });
    });
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            pendingDeleteId = btn.dataset.id;
            deleteTitle.textContent = btn.dataset.title;
            deleteModal.classList.remove("hidden");
        });
    });
    document.querySelectorAll(".view-reg-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const cid = btn.dataset.id;
            const select = document.getElementById("filterContestSelect");
            if (select) {
                select.value = cid;
                loadRegistrations(cid);
                const regSection = document.getElementById("registrationsSection");
                if (regSection) regSection.scrollIntoView({ behavior: "smooth" });
            }
        });
    });
}

// ==========================================
// TOGGLE CREATE
// ==========================================
toggleCreateBtn.addEventListener("click", () => {
    const form = createForm;
    const hidden = form.style.display === "none";
    form.style.display = hidden ? "" : "none";
    toggleCreateBtn.textContent = hidden ? "Hide" : "Show";
});

// Set the form as hidden on page load to match the "Show" initial button state
createForm.style.display = "none";
toggleCreateBtn.textContent = "Show";

// ==========================================
// CREATE
// ==========================================
createForm.addEventListener("submit", async e => {
    e.preventDefault();
    const body = {
        title:      document.getElementById("contestTitle").value.trim(),
        description:document.getElementById("contestDescription").value.trim(),
        start_time: document.getElementById("contestStartTime").value,
        end_time:   document.getElementById("contestEndTime").value || null
    };
    createBtn.disabled = true; createBtn.textContent = "Creating...";
    try {
        const res = await fetch("/api/admin/contests", { method:"POST", headers:authHeaders(), body:JSON.stringify(body) });
        if (handleUnauth(res.status)) return;
        const json = await res.json();
        if (!res.ok) { showMessage(json.message||"Failed to create", "error"); return; }
        showMessage(`Contest "${body.title}" created!`);
        createForm.reset(); await loadContests();
    } catch(e) { showMessage("Network error","error"); }
    finally { createBtn.disabled=false; createBtn.textContent="Create Contest"; }
});

// ==========================================
// EDIT MODAL
// ==========================================
function openEditModal(c) {
    document.getElementById("editContestId").value          = c.contest_id;
    document.getElementById("editContestTitle").value       = c.title;
    document.getElementById("editContestDescription").value = c.description||"";
    document.getElementById("editContestStartTime").value   = toDatetimeLocal(c.start_time);
    document.getElementById("editContestEndTime").value     = c.end_time ? toDatetimeLocal(c.end_time) : "";
    editModal.classList.remove("hidden");
}
function closeEditModal() { editModal.classList.add("hidden"); editForm.reset(); }
closeModalBtn.addEventListener("click", closeEditModal);
cancelEditBtn.addEventListener("click", closeEditModal);
editModal.addEventListener("click", e => { if(e.target===editModal) closeEditModal(); });

editForm.addEventListener("submit", async e => {
    e.preventDefault();
    const id = document.getElementById("editContestId").value;
    const body = {
        title:      document.getElementById("editContestTitle").value.trim(),
        description:document.getElementById("editContestDescription").value.trim(),
        start_time: document.getElementById("editContestStartTime").value,
        end_time:   document.getElementById("editContestEndTime").value || null
    };
    editBtn.disabled = true; editBtn.textContent = "Saving...";
    try {
        const res = await fetch(`/api/admin/contests/${id}`, { method:"PUT", headers:authHeaders(), body:JSON.stringify(body) });
        if (handleUnauth(res.status)) return;
        const json = await res.json();
        if (!res.ok) { showMessage(json.message||"Failed to update","error"); return; }
        showMessage("Contest updated!"); closeEditModal(); await loadContests();
    } catch(e) { showMessage("Network error","error"); }
    finally { editBtn.disabled=false; editBtn.textContent="Save Changes"; }
});

// ==========================================
// DELETE
// ==========================================
function closeDeleteModal() { deleteModal.classList.add("hidden"); pendingDeleteId=null; }
cancelDelBtn.addEventListener("click", closeDeleteModal);
closeDeleteBtn.addEventListener("click", closeDeleteModal);
deleteModal.addEventListener("click", e => { if(e.target===deleteModal) closeDeleteModal(); });

confirmDelBtn.addEventListener("click", async () => {
    if (!pendingDeleteId) return;
    confirmDelBtn.disabled=true; confirmDelBtn.textContent="Deleting...";
    try {
        const res = await fetch(`/api/admin/contests/${pendingDeleteId}`, { method:"DELETE", headers:authHeaders() });
        if (handleUnauth(res.status)) return;
        const json = await res.json();
        if (!res.ok) { showMessage(json.message||"Failed to delete","error"); closeDeleteModal(); return; }
        showMessage("Contest deleted."); closeDeleteModal(); await loadContests();
    } catch(e) { showMessage("Network error","error"); closeDeleteModal(); }
    finally { confirmDelBtn.disabled=false; confirmDelBtn.textContent="Yes, Delete"; }
});

refreshBtn.addEventListener("click", () => {
    loadContests();
    loadRegistrations(filterSelect ? (filterSelect.value || null) : null);
});

// ==========================================
// REGISTRATIONS & PARTICIPANTS
// ==========================================
const regTableBody  = document.getElementById("registrationsTableBody");
const filterSelect  = document.getElementById("filterContestSelect");
const refreshRegBtn = document.getElementById("refreshRegBtn");

async function loadRegistrations(contestId = null) {
    if (!regTableBody) return;
    regTableBody.innerHTML = `<tr><td colspan="6" class="loading-row"><div class="spinner"></div>Loading registrations...</td></tr>`;
    try {
        const url = contestId 
            ? `/api/admin/contests/registrations?contest_id=${contestId}`
            : `/api/admin/contests/registrations`;
        const res = await fetch(url, { headers: authHeaders() });
        if (handleUnauth(res.status)) return;
        const json = await res.json();
        if (!res.ok) {
            regTableBody.innerHTML = `<tr><td colspan="6" class="loading-row">${json.message || "Failed to load"}</td></tr>`;
            return;
        }
        const data = json.data || [];
        renderRegistrations(data);
    } catch(e) {
        console.error(e);
        regTableBody.innerHTML = `<tr><td colspan="6" class="loading-row">Network error</td></tr>`;
    }
}

function renderRegistrations(list) {
    if (!list.length) {
        regTableBody.innerHTML = `<tr><td colspan="6" class="loading-row">No user registrations found.</td></tr>`;
        return;
    }
    regTableBody.innerHTML = list.map(r => `
        <tr>
            <td>
                <span style="font-weight:700;color:#818cf8;">${escapeHtml(r.contest_title)}</span>
                <span style="color:#64748b;font-size:0.75rem;margin-left:4px;">#${r.contest_id}</span>
            </td>
            <td>
                <span style="font-weight:600;color:#e2e8f0;">${escapeHtml(r.username)}</span>
            </td>
            <td style="color:#94a3b8;">${escapeHtml(r.email)}</td>
            <td>
                <span style="background:#1e293b;border:1px solid #334155;padding:2px 8px;border-radius:4px;font-weight:600;color:#38bdf8;">
                    ${r.rating || 0}
                </span>
            </td>
            <td style="color:#94a3b8;font-size:0.85rem;">${formatDate(r.registered_at)}</td>
            <td>
                <span style="color:#10b981;font-weight:700;">${r.solve_count || 0} solved</span>
                <span style="color:#64748b;font-size:0.8rem;">(${r.score || 0} pts)</span>
            </td>
        </tr>
    `).join("");
}

if (filterSelect) {
    filterSelect.addEventListener("change", () => {
        loadRegistrations(filterSelect.value || null);
    });
}

if (refreshRegBtn) {
    refreshRegBtn.addEventListener("click", () => {
        loadRegistrations(filterSelect ? (filterSelect.value || null) : null);
    });
}

loadContests();
loadRegistrations();

