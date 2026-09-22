const BLOGS_API = "/api/blogs";
const TOKEN_KEY = "token";

const token = localStorage.getItem(TOKEN_KEY);

// Elements
const postsContainer     = document.getElementById("postsContainer");
const loadingState       = document.getElementById("loadingState");
const emptyState         = document.getElementById("emptyState");
const searchInput        = document.getElementById("searchInput");
const tagsFilterContainer= document.getElementById("tagsFilterContainer");
const openCreateModalBtn = document.getElementById("openCreateModalBtn");
const createModal        = document.getElementById("createModal");
const closeModalBtn      = document.getElementById("closeModalBtn");
const cancelModalBtn     = document.getElementById("cancelModalBtn");
const createPostForm     = document.getElementById("createPostForm");
const postTitleInput     = document.getElementById("postTitle");
const postTagsInput      = document.getElementById("postTags");
const postContentInput   = document.getElementById("postContent");
const submitPostBtn      = document.getElementById("submitPostBtn");
const logoutBtn          = document.getElementById("logoutBtn");

let activeTag = "";
let searchDebounceTimeout = null;

if (!token) {
    window.location.href = "/auth/login";
} else {
    showAdminNavLink();
    init();
}

function init() {
    loadPosts();
    setupEventListeners();
}

function setupEventListeners() {
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem(TOKEN_KEY);
            window.location.href = "/auth/login";
        });
    }

    // Modal controls
    openCreateModalBtn.addEventListener("click", () => {
        createModal.classList.remove("hidden");
        postTitleInput.focus();
    });

    const hideModal = () => {
        createModal.classList.add("hidden");
        createPostForm.reset();
    };

    closeModalBtn.addEventListener("click", hideModal);
    cancelModalBtn.addEventListener("click", hideModal);
    createModal.addEventListener("click", (e) => {
        if (e.target === createModal) hideModal();
    });

    // Tag filter chips
    tagsFilterContainer.addEventListener("click", (e) => {
        const chip = e.target.closest(".filter-chip");
        if (!chip) return;

        tagsFilterContainer.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        activeTag = chip.dataset.tag || "";
        loadPosts();
    });

    // Search with debounce
    searchInput.addEventListener("input", () => {
        clearTimeout(searchDebounceTimeout);
        searchDebounceTimeout = setTimeout(() => {
            loadPosts();
        }, 350);
    });

    // Submit new post
    createPostForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = postTitleInput.value.trim();
        const content = postContentInput.value.trim();
        const tagsRaw = postTagsInput.value.trim();

        if (!title || !content) return;

        submitPostBtn.disabled = true;
        submitPostBtn.textContent = "Publishing...";

        try {
            const res = await fetch(BLOGS_API, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    title,
                    content,
                    tagIds: [] // Can be linked by tags query or left empty
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || "Failed to publish post");
            }

            hideModal();
            loadPosts();
        } catch (err) {
            alert(err.message);
        } finally {
            submitPostBtn.disabled = false;
            submitPostBtn.textContent = "Publish Post";
        }
    });
}

async function loadPosts() {
    loadingState.classList.remove("hidden");
    emptyState.classList.add("hidden");
    postsContainer.replaceChildren();

    const params = new URLSearchParams();
    if (activeTag) params.append("tag", activeTag);
    const searchVal = searchInput.value.trim();
    if (searchVal) params.append("search", searchVal);

    try {
        const res = await fetch(`${BLOGS_API}?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (res.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            window.location.href = "/auth/login";
            return;
        }

        if (!res.ok) throw new Error("Failed to load posts");

        const posts = await res.json();
        loadingState.classList.add("hidden");

        if (!posts || posts.length === 0) {
            emptyState.classList.remove("hidden");
            return;
        }

        renderPosts(posts);
    } catch (err) {
        console.error("Error loading posts:", err);
        loadingState.classList.add("hidden");
        postsContainer.innerHTML = '<p style="color:#ef4444;text-align:center;">Failed to load posts. Please try again.</p>';
    }
}

function renderPosts(posts) {
    postsContainer.replaceChildren();

    posts.forEach(post => {
        const card = document.createElement("article");
        card.className = "post-card";

        const tagsHtml = post.tags
            ? post.tags.split(",").map(t => `<span class="tag-badge">${escapeHtml(t.trim())}</span>`).join(" ")
            : "";

        const avatarInitial = (post.author_name || "U")[0].toUpperCase();
        const roleBadge = post.author_role === "admin"
            ? `<span class="role-badge">👑 Admin</span>`
            : "";

        card.innerHTML = `
            <div class="post-header">
                <div class="author-info">
                    <div class="author-avatar">${avatarInitial}</div>
                    <span class="author-name">${escapeHtml(post.author_name || "Anonymous")}</span>
                    ${roleBadge}
                </div>
                <span>#${post.post_id}</span>
            </div>

            <a href="/blogs/${post.post_id}" class="post-title">${escapeHtml(post.title)}</a>

            <p class="post-excerpt">${escapeHtml(post.content)}</p>

            ${tagsHtml ? `<div class="post-tags">${tagsHtml}</div>` : ""}

            <div class="post-footer">
                <div class="post-stats">
                    <span class="stat-item" title="Likes">👍 ${post.likes_count || 0}</span>
                    <span class="stat-item" title="Comments">💬 ${post.comments_count || 0}</span>
                </div>
                <button class="btn-bookmark ${post.is_bookmarked ? 'bookmarked' : ''}" 
                        data-id="${post.post_id}" 
                        title="${post.is_bookmarked ? 'Bookmarked' : 'Bookmark post'}">
                    ${post.is_bookmarked ? '★' : '☆'}
                </button>
            </div>
        `;

        // Bookmark toggle
        const bookmarkBtn = card.querySelector(".btn-bookmark");
        bookmarkBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
                const bRes = await fetch(`${BLOGS_API}/${post.post_id}/bookmark`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (bRes.ok) {
                    const data = await bRes.json();
                    bookmarkBtn.classList.toggle("bookmarked", data.isBookmarked);
                    bookmarkBtn.textContent = data.isBookmarked ? '★' : '☆';
                }
            } catch (err) {
                console.error("Bookmark toggle failed:", err);
            }
        });

        postsContainer.appendChild(card);
    });
}

function escapeHtml(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
