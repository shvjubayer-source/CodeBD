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
const tagsGrid      = document.getElementById("tagsGrid");
const messageEl     = document.getElementById("message");
const createTagForm = document.getElementById("createTagForm");
const createTagBtn  = document.getElementById("createTagBtn");
const refreshBtn    = document.getElementById("refreshBtn");
const deleteModal   = document.getElementById("deleteModal");
const confirmDelBtn = document.getElementById("confirmDeleteBtn");
const cancelDelBtn  = document.getElementById("cancelDeleteBtn");
const closeDeleteBtn= document.getElementById("closeDeleteBtn");
const deleteTagName = document.getElementById("deleteTagName");

let allTags = [];
let pendingDeleteId = null;

function showMessage(text, type="success") {
    messageEl.textContent = text; messageEl.className=`message ${type}`;
    messageEl.classList.remove("hidden");
    clearTimeout(messageEl._t);
    messageEl._t = setTimeout(()=>messageEl.classList.add("hidden"),4000);
}

function escapeHtml(s) {
    return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// LOAD TAGS
async function loadTags() {
    tagsGrid.innerHTML = `<div style="padding:40px;text-align:center;color:#475569"><div class="spinner" style="display:inline-block"></div> Loading...</div>`;
    try {
        const res = await fetch("/api/admin/tags", { headers: authHeaders() });
        if (handleUnauth(res.status)) return;
        const json = await res.json();
        if (!res.ok) { tagsGrid.innerHTML=`<p style="color:#f87171;padding:20px">${json.message||"Error"}</p>`; return; }
        allTags = json.data || json;
        renderTags(allTags);
    } catch(e) {
        tagsGrid.innerHTML = `<p style="color:#f87171;padding:20px">Network error</p>`;
    }
}

function renderTags(tags) {
    if (!tags.length) {
        tagsGrid.innerHTML = `<p style="color:#475569;padding:20px">No tags yet. Add one above.</p>`;
        return;
    }
    tagsGrid.innerHTML = tags.map(t => `
        <div class="tag-chip">
            <span>${escapeHtml(t.tag_name)}</span>
            <button class="tag-delete" data-id="${t.tag_id}" data-name="${escapeHtml(t.tag_name)}" title="Delete tag">✕</button>
        </div>
    `).join("");
    document.querySelectorAll(".tag-delete").forEach(btn => {
        btn.addEventListener("click", () => {
            pendingDeleteId = btn.dataset.id;
            deleteTagName.textContent = btn.dataset.name;
            deleteModal.classList.remove("hidden");
        });
    });
}

// CREATE TAG
createTagForm.addEventListener("submit", async e => {
    e.preventDefault();
    const tag_name = document.getElementById("tagName").value.trim();
    createTagBtn.disabled=true; createTagBtn.textContent="Adding...";
    try {
        const res = await fetch("/api/admin/tags", {
            method:"POST", headers:authHeaders(), body:JSON.stringify({tag_name})
        });
        if (handleUnauth(res.status)) return;
        const json = await res.json();
        if (!res.ok) { showMessage(json.message||"Failed","error"); return; }
        showMessage(`Tag "${tag_name}" added!`);
        createTagForm.reset(); await loadTags();
    } catch(e) { showMessage("Network error","error"); }
    finally { createTagBtn.disabled=false; createTagBtn.textContent="Add Tag"; }
});

// DELETE
function closeDeleteModal() { deleteModal.classList.add("hidden"); pendingDeleteId=null; }
cancelDelBtn.addEventListener("click", closeDeleteModal);
closeDeleteBtn.addEventListener("click", closeDeleteModal);
deleteModal.addEventListener("click", e => { if(e.target===deleteModal) closeDeleteModal(); });

confirmDelBtn.addEventListener("click", async () => {
    if (!pendingDeleteId) return;
    confirmDelBtn.disabled=true; confirmDelBtn.textContent="Deleting...";
    try {
        const res = await fetch(`/api/admin/tags/${pendingDeleteId}`, { method:"DELETE", headers:authHeaders() });
        if (handleUnauth(res.status)) return;
        const json = await res.json();
        if (!res.ok) { showMessage(json.message||"Failed","error"); closeDeleteModal(); return; }
        showMessage("Tag deleted."); closeDeleteModal(); await loadTags();
    } catch(e) { showMessage("Network error","error"); closeDeleteModal(); }
    finally { confirmDelBtn.disabled=false; confirmDelBtn.textContent="Yes, Delete"; }
});

refreshBtn.addEventListener("click", loadTags);
loadTags();
