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
    tableBody.innerHTML = `<tr><td colspan="5" class="loading-row"><div class="spinner"></div>Loading...</td></tr>`;
    try {
        const res = await fetch("/api/admin/contests", { headers: authHeaders() });
        if (handleUnauth(res.status)) return;
        const json = await res.json();
        if (!res.ok) { tableBody.innerHTML = `<tr><td colspan="5" class="loading-row">${json.message||"Error"}</td></tr>`; return; }
        allContests = json.data || json;
        renderContests(allContests);
    } catch(e) {
        console.error(e);
        tableBody.innerHTML = `<tr><td colspan="5" class="loading-row">Network error</td></tr>`;
    }
}

function renderContests(contests) {
    if (!contests.length) { tableBody.innerHTML = `<tr><td colspan="5" class="loading-row">No contests found.</td></tr>`; return; }
    tableBody.innerHTML = contests.map(c => `
        <tr>
            <td style="color:#475569;font-weight:600">#${c.contest_id}</td>
            <td style="font-weight:600;color:#e2e8f0">${escapeHtml(c.title)}</td>
            <td style="color:#94a3b8;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(c.description||"—")}</td>
            <td>${formatDate(c.start_time)}</td>
            <td>
                <button class="edit-btn" data-id="${c.contest_id}">✏ Edit</button>
                <button class="delete-btn" data-id="${c.contest_id}" data-title="${escapeHtml(c.title)}">🗑 Delete</button>
            </td>
        </tr>
    `).join("");
    attachEvents();
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

// ==========================================
// CREATE
// ==========================================
createForm.addEventListener("submit", async e => {
    e.preventDefault();
    const body = {
        title:      document.getElementById("contestTitle").value.trim(),
        description:document.getElementById("contestDescription").value.trim(),
        start_time: document.getElementById("contestStartTime").value
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
        start_time: document.getElementById("editContestStartTime").value
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

refreshBtn.addEventListener("click", loadContests);
loadContests();
