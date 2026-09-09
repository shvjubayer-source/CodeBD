// ==========================================
// GUARD — non-admins are redirected to /home
// requireAdmin & showAdminNavLink come from auth-utils.js
// ==========================================
requireAdmin();
showAdminNavLink();

// ==========================================
// AUTH HELPERS  — uses Bearer token from localStorage
// ==========================================

function getToken() {
    return localStorage.getItem("token");
}

function authHeaders() {
    return {
        "Authorization": `Bearer ${getToken()}`,
        "Content-Type": "application/json"
    };
}

function handleUnauthorized(status) {
    if (status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/auth/login";
        return true;
    }
    return false;
}


// ==========================================
// DOM REFERENCES
// ==========================================

const tableBody        = document.getElementById("problemTableBody");
const messageEl        = document.getElementById("message");
const searchInput      = document.getElementById("searchInput");
const refreshBtn       = document.getElementById("refreshBtn");
const problemCountEl   = document.getElementById("problemCount");

// Create form
const createSection    = document.getElementById("createSection");
const createForm       = document.getElementById("createForm");
const createSubmitBtn  = document.getElementById("createSubmitBtn");
const toggleCreateBtn  = document.getElementById("toggleCreateBtn");

// Edit modal
const editModal        = document.getElementById("editModal");
const editForm         = document.getElementById("editForm");
const editSubmitBtn    = document.getElementById("editSubmitBtn");
const closeModalBtn    = document.getElementById("closeModalBtn");
const cancelEditBtn    = document.getElementById("cancelEditBtn");

// Delete modal
const deleteModal         = document.getElementById("deleteModal");
const confirmDeleteBtn    = document.getElementById("confirmDeleteBtn");
const cancelDeleteBtn     = document.getElementById("cancelDeleteBtn");
const closeDeleteModalBtn = document.getElementById("closeDeleteModalBtn");
const deleteProblemTitle  = document.getElementById("deleteProblemTitle");

// Sidebar navigation
const sidebarProblems    = document.getElementById("sidebarProblems");
const sidebarAddProblem  = document.getElementById("sidebarAddProblem");

// Logout
const logoutBtn = document.getElementById("logoutBtn");


// ==========================================
// STATE
// ==========================================

let allProblems = [];
let pendingDeleteId = null;


// ==========================================
// SHOW MESSAGE
// ==========================================

function showMessage(text, type = "success") {
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.classList.remove("hidden");

    clearTimeout(messageEl._timeout);
    messageEl._timeout = setTimeout(() => {
        messageEl.classList.add("hidden");
    }, 4000);
}


// ==========================================
// LOAD PROBLEMS
// ==========================================

async function loadProblems() {
    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="loading-row">
                <div class="spinner"></div>
                Loading problems...
            </td>
        </tr>
    `;

    const token = getToken();
    if (!token) {
        window.location.href = "/auth/login";
        return;
    }

    try {
        const response = await fetch("/api/problems", {
            method: "GET",
            headers: authHeaders()
        });

        if (handleUnauthorized(response.status)) return;

        const data = await response.json();

        if (!response.ok) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="loading-row">
                        ${data.message || "Failed to load problems"}
                    </td>
                </tr>
            `;
            return;
        }

        allProblems = Array.isArray(data) ? data : (data.data || []);
        renderProblems(allProblems);

    } catch (error) {
        console.error(error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="loading-row">
                    Network error. Please try again.
                </td>
            </tr>
        `;
    }
}


// ==========================================
// RENDER PROBLEMS
// ==========================================

function renderProblems(problems) {
    tableBody.innerHTML = "";

    if (problems.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="loading-row">
                    No problems found.
                </td>
            </tr>
        `;
        problemCountEl.textContent = "";
        return;
    }

    problems.forEach(problem => {
        const diff = (problem.difficulty || "").toLowerCase();
        const row = document.createElement("tr");

        row.innerHTML = `
            <td class="problem-id-cell">#${problem.problem_id}</td>

            <td class="problem-title-cell" title="${escapeHtml(problem.title)}">
                ${escapeHtml(problem.title)}
            </td>

            <td>
                <span class="difficulty-badge ${diff}">
                    ${escapeHtml(problem.difficulty)}
                </span>
            </td>

            <td>${problem.time_limit ?? "—"}</td>

            <td>${problem.memory_limit ?? "—"}</td>

            <td>
                <button
                    class="edit-btn"
                    data-id="${problem.problem_id}"
                >
                    ✏ Edit
                </button>
                <button
                    class="delete-btn"
                    data-id="${problem.problem_id}"
                    data-title="${escapeHtml(problem.title)}"
                >
                    🗑 Delete
                </button>
            </td>
        `;

        tableBody.appendChild(row);
    });

    problemCountEl.textContent = `Showing ${problems.length} problem${problems.length !== 1 ? "s" : ""}`;

    attachTableButtonEvents();
}


// ==========================================
// ESCAPE HTML (prevent XSS)
// ==========================================

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}


// ==========================================
// TABLE BUTTON EVENTS
// ==========================================

function attachTableButtonEvents() {
    document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = Number(btn.dataset.id);
            const problem = allProblems.find(p => p.problem_id === id);
            if (problem) openEditModal(problem);
        });
    });

    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            pendingDeleteId = btn.dataset.id;
            deleteProblemTitle.textContent = btn.dataset.title;
            deleteModal.classList.remove("hidden");
        });
    });
}


// ==========================================
// SEARCH
// ==========================================

searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
        renderProblems(allProblems);
        return;
    }
    const filtered = allProblems.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.difficulty.toLowerCase().includes(query)
    );
    renderProblems(filtered);
});


// ==========================================
// TOGGLE CREATE SECTION
// ==========================================

toggleCreateBtn.addEventListener("click", () => {
    const form = createSection.querySelector(".problem-form");
    if (form.style.display === "none") {
        form.style.display = "";
        toggleCreateBtn.textContent = "Hide";
    } else {
        form.style.display = "none";
        toggleCreateBtn.textContent = "Show";
    }
});

sidebarAddProblem.addEventListener("click", (e) => {
    e.preventDefault();
    const form = createSection.querySelector(".problem-form");
    form.style.display = "";
    toggleCreateBtn.textContent = "Hide";
    createSection.scrollIntoView({ behavior: "smooth" });
    setSidebarActive(sidebarAddProblem);
});

sidebarProblems.addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("problemsSection").scrollIntoView({ behavior: "smooth" });
    setSidebarActive(sidebarProblems);
});

function setSidebarActive(el) {
    document.querySelectorAll(".sidebar-link").forEach(l => l.classList.remove("active"));
    el.classList.add("active");
}


// ==========================================
// CREATE PROBLEM
// ==========================================

createForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const newProblem = {
        title:        document.getElementById("createTitle").value.trim(),
        statement:    document.getElementById("createStatement").value.trim(),
        difficulty:   document.getElementById("createDifficulty").value,
        time_limit:   Number(document.getElementById("createTimeLimit").value),
        memory_limit: Number(document.getElementById("createMemoryLimit").value)
    };

    createSubmitBtn.disabled = true;
    createSubmitBtn.textContent = "Creating...";

    try {
        const response = await fetch("/api/problems", {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify(newProblem)
        });

        if (handleUnauthorized(response.status)) return;

        const data = await response.json();

        if (response.status === 403) {
            showMessage("Access denied: Admins only.", "error");
            return;
        }

        if (!response.ok) {
            showMessage(data.message || "Failed to create problem.", "error");
            return;
        }

        showMessage(`Problem "${newProblem.title}" created successfully!`, "success");
        createForm.reset();
        await loadProblems();

    } catch (err) {
        console.error(err);
        showMessage("Network error. Please try again.", "error");
    } finally {
        createSubmitBtn.disabled = false;
        createSubmitBtn.textContent = "Create Problem";
    }
});


// ==========================================
// OPEN EDIT MODAL
// ==========================================

function openEditModal(problem) {
    document.getElementById("editProblemId").value    = problem.problem_id;
    document.getElementById("editTitle").value        = problem.title;
    document.getElementById("editStatement").value    = problem.statement || "";
    document.getElementById("editDifficulty").value   = problem.difficulty;
    document.getElementById("editTimeLimit").value    = problem.time_limit || "";
    document.getElementById("editMemoryLimit").value  = problem.memory_limit || "";

    editModal.classList.remove("hidden");
}

function closeEditModal() {
    editModal.classList.add("hidden");
    editForm.reset();
}

closeModalBtn.addEventListener("click", closeEditModal);
cancelEditBtn.addEventListener("click", closeEditModal);

editModal.addEventListener("click", (e) => {
    if (e.target === editModal) closeEditModal();
});


// ==========================================
// UPDATE PROBLEM
// ==========================================

editForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const problemId = document.getElementById("editProblemId").value;

    const updated = {
        title:        document.getElementById("editTitle").value.trim(),
        statement:    document.getElementById("editStatement").value.trim(),
        difficulty:   document.getElementById("editDifficulty").value,
        time_limit:   Number(document.getElementById("editTimeLimit").value),
        memory_limit: Number(document.getElementById("editMemoryLimit").value)
    };

    editSubmitBtn.disabled = true;
    editSubmitBtn.textContent = "Saving...";

    try {
        const response = await fetch(`/api/problems/${problemId}`, {
            method: "PUT",
            headers: authHeaders(),
            body: JSON.stringify(updated)
        });

        if (handleUnauthorized(response.status)) return;

        const data = await response.json();

        if (response.status === 403) {
            showMessage("Access denied: Admins only.", "error");
            closeEditModal();
            return;
        }

        if (!response.ok) {
            showMessage(data.message || "Failed to update problem.", "error");
            return;
        }

        showMessage(`Problem updated successfully!`, "success");
        closeEditModal();
        await loadProblems();

    } catch (err) {
        console.error(err);
        showMessage("Network error. Please try again.", "error");
    } finally {
        editSubmitBtn.disabled = false;
        editSubmitBtn.textContent = "Save Changes";
    }
});


// ==========================================
// DELETE PROBLEM
// ==========================================

function closeDeleteModal() {
    deleteModal.classList.add("hidden");
    pendingDeleteId = null;
}

cancelDeleteBtn.addEventListener("click", closeDeleteModal);
closeDeleteModalBtn.addEventListener("click", closeDeleteModal);

deleteModal.addEventListener("click", (e) => {
    if (e.target === deleteModal) closeDeleteModal();
});

confirmDeleteBtn.addEventListener("click", async () => {
    if (!pendingDeleteId) return;

    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.textContent = "Deleting...";

    try {
        const response = await fetch(`/api/problems/${pendingDeleteId}`, {
            method: "DELETE",
            headers: authHeaders()
        });

        if (handleUnauthorized(response.status)) return;

        const data = await response.json();

        if (response.status === 403) {
            showMessage("Access denied: Admins only.", "error");
            closeDeleteModal();
            return;
        }

        if (!response.ok) {
            showMessage(data.message || "Failed to delete problem.", "error");
            closeDeleteModal();
            return;
        }

        showMessage("Problem deleted successfully.", "success");
        closeDeleteModal();
        await loadProblems();

    } catch (err) {
        console.error(err);
        showMessage("Network error. Please try again.", "error");
        closeDeleteModal();
    } finally {
        confirmDeleteBtn.disabled = false;
        confirmDeleteBtn.textContent = "Yes, Delete";
    }
});


// ==========================================
// REFRESH BUTTON
// ==========================================

refreshBtn.addEventListener("click", loadProblems);


// ==========================================
// LOGOUT
// ==========================================

logoutBtn.addEventListener("click", async () => {
    try {
        await fetch("/api/auth/logout", {
            method: "POST",
            headers: authHeaders()
        });
    } catch (_) { /* no-op */ }

    localStorage.removeItem("token");
    window.location.href = "/auth/login";
});


// ==========================================
// GUARD: redirect if not logged in
// ==========================================

(function checkAuth() {
    if (!getToken()) {
        window.location.href = "/auth/login";
    }
})();


// ==========================================
// INITIAL LOAD
// ==========================================

loadProblems();