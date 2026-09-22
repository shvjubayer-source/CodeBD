const BLOGS_API = "/api/blogs";
const TOKEN_KEY = "token";

const token = localStorage.getItem(TOKEN_KEY);

// Get post ID from URL (/blogs/1)
const pathParts = window.location.pathname.split("/");
const postId = pathParts[pathParts.length - 1];

// Elements
const loadingState      = document.getElementById("loadingState");
const errorState        = document.getElementById("errorState");
const postContentArea   = document.getElementById("postContentArea");
const breadcrumbTitle   = document.getElementById("breadcrumbTitle");

const authorAvatar      = document.getElementById("authorAvatar");
const authorName        = document.getElementById("authorName");
const authorRole        = document.getElementById("authorRole");
const postIdTag         = document.getElementById("postIdTag");
const postTitle         = document.getElementById("postTitle");
const postTags          = document.getElementById("postTags");
const postBody          = document.getElementById("postBody");
const deletePostBtn     = document.getElementById("deletePostBtn");

const likeBtn           = document.getElementById("likeBtn");
const dislikeBtn        = document.getElementById("dislikeBtn");
const likesCount        = document.getElementById("likesCount");
const dislikesCount     = document.getElementById("dislikesCount");
const bookmarkBtn       = document.getElementById("bookmarkBtn");
const bookmarkIcon      = document.getElementById("bookmarkIcon");
const bookmarkText      = document.getElementById("bookmarkText");

const commentsHeader    = document.getElementById("commentsHeader");
const commentForm       = document.getElementById("commentForm");
const commentText       = document.getElementById("commentText");
const submitCommentBtn  = document.getElementById("submitCommentBtn");
const commentsList      = document.getElementById("commentsList");
const logoutBtn         = document.getElementById("logoutBtn");

let currentPost = null;
let currentUserId = null;

if (!token) {
    window.location.href = "/auth/login";
} else {
    showAdminNavLink();
    init();
}

function getCurrentUserFromToken() {
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload;
    } catch (e) {
        return null;
    }
}

function init() {
    const user = getCurrentUserFromToken();
    if (user) {
        currentUserId = user.userId || user.user_id;
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem(TOKEN_KEY);
            window.location.href = "/auth/login";
        });
    }

    loadPost();
    loadComments();
    setupEventListeners();
}

function setupEventListeners() {
    // Voting
    likeBtn.addEventListener("click", () => handleVote("like"));
    dislikeBtn.addEventListener("click", () => handleVote("dislike"));

    // Bookmark
    bookmarkBtn.addEventListener("click", handleBookmark);

    // Delete post
    deletePostBtn.addEventListener("click", handleDeletePost);

    // Add comment
    commentForm.addEventListener("submit", handleAddComment);
}

async function loadPost() {
    try {
        const res = await fetch(`${BLOGS_API}/${postId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (res.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            window.location.href = "/auth/login";
            return;
        }

        if (res.status === 404 || !res.ok) {
            loadingState.classList.add("hidden");
            errorState.classList.remove("hidden");
            return;
        }

        currentPost = await res.json();
        renderPost(currentPost);
    } catch (err) {
        console.error("Error loading post:", err);
        loadingState.classList.add("hidden");
        errorState.classList.remove("hidden");
    }
}

function renderPost(post) {
    document.title = `${post.title} | CodeBD`;
    breadcrumbTitle.textContent = post.title;

    authorAvatar.textContent = (post.author_name || "U")[0].toUpperCase();
    authorName.textContent   = post.author_name || "Anonymous";

    if (post.author_role === "admin") {
        authorRole.textContent = "👑 Admin";
        authorRole.classList.remove("hidden");
    }

    postIdTag.textContent = `#${post.post_id}`;
    postTitle.textContent = post.title;

    // Render tags
    postTags.replaceChildren();
    if (post.tags) {
        post.tags.split(",").map(t => t.trim()).filter(Boolean).forEach(tag => {
            const span = document.createElement("span");
            span.className = "tag-badge";
            span.textContent = tag;
            postTags.appendChild(span);
        });
    }

    // Render content with code blocks & markdown
    renderPostBody(post.content);

    // Votes & bookmark state
    updateVoteUI(post.user_vote, post.likes_count, post.dislikes_count);
    updateBookmarkUI(post.is_bookmarked);

    // Delete post button visibility
    const isOwner = currentUserId && (currentUserId === post.user_id);
    const adminRole = typeof isAdmin === "function" ? isAdmin() : false;
    if (isOwner || adminRole) {
        deletePostBtn.classList.remove("hidden");
    }

    loadingState.classList.add("hidden");
    postContentArea.classList.remove("hidden");
}

function renderPostBody(content) {
    if (!content) {
        postBody.innerHTML = "<p>No content provided.</p>";
        return;
    }

    const parts = content.split(/(```[\s\S]*?```)/g);
    let html = "";
    for (const part of parts) {
        if (part.startsWith("```") && part.endsWith("```")) {
            const firstLineBreak = part.indexOf("\n");
            let code = "";
            if (firstLineBreak !== -1) {
                code = part.substring(firstLineBreak + 1, part.length - 3);
            } else {
                code = part.substring(3, part.length - 3);
            }
            html += `<pre><code>${escapeHtml(code.trim())}</code></pre>`;
        } else {
            let formatted = escapeHtml(part)
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/`(.*?)`/g, '<code>$1</code>')
                .replace(/\n\n+/g, '<br><br>')
                .replace(/\n/g, '<br>');
            html += `<div>${formatted}</div>`;
        }
    }
    postBody.innerHTML = html;
}

function updateVoteUI(userVote, likes, dislikes) {
    likesCount.textContent = likes || 0;
    dislikesCount.textContent = dislikes || 0;

    likeBtn.classList.toggle("active-like", userVote === "like");
    dislikeBtn.classList.toggle("active-dislike", userVote === "dislike");
}

function updateBookmarkUI(isBookmarked) {
    bookmarkIcon.textContent = isBookmarked ? "★" : "☆";
    bookmarkText.textContent = isBookmarked ? "Bookmarked" : "Bookmark";
    bookmarkBtn.classList.toggle("bookmarked", Boolean(isBookmarked));
}

async function handleVote(type) {
    try {
        const res = await fetch(`${BLOGS_API}/${postId}/vote`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ type })
        });
        if (res.ok) {
            const data = await res.json();
            updateVoteUI(data.userVote, data.likesCount, data.dislikesCount);
        }
    } catch (err) {
        console.error("Vote failed:", err);
    }
}

async function handleBookmark() {
    try {
        const res = await fetch(`${BLOGS_API}/${postId}/bookmark`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            updateBookmarkUI(data.isBookmarked);
        }
    } catch (err) {
        console.error("Bookmark failed:", err);
    }
}

async function handleDeletePost() {
    if (!confirm("Are you sure you want to permanently delete this discussion post?")) return;

    deletePostBtn.disabled = true;
    try {
        const res = await fetch(`${BLOGS_API}/${postId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            window.location.href = "/blogs";
        } else {
            const data = await res.json();
            alert(data.message || "Failed to delete post");
            deletePostBtn.disabled = false;
        }
    } catch (err) {
        alert("Error deleting post: " + err.message);
        deletePostBtn.disabled = false;
    }
}

// ── Comments ──────────────────────────────────────────────────────────────────
async function loadComments() {
    try {
        const res = await fetch(`${BLOGS_API}/${postId}/comments`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;

        const comments = await res.json();
        renderComments(comments);
    } catch (err) {
        console.error("Error loading comments:", err);
    }
}

function renderComments(comments) {
    commentsHeader.textContent = `Discussion (${comments.length})`;
    commentsList.replaceChildren();

    if (comments.length === 0) {
        commentsList.innerHTML = '<p style="color:#94a3b8;font-style:italic;">No comments yet. Start the conversation!</p>';
        return;
    }

    comments.forEach(c => {
        const item = document.createElement("div");
        item.className = "comment-card";

        const isOwner = currentUserId && (currentUserId === c.user_id);
        const adminRole = typeof isAdmin === "function" ? isAdmin() : false;
        const canDelete = isOwner || adminRole;

        const roleBadge = c.role === "admin"
            ? '<span class="role-badge">👑 Admin</span>'
            : '';

        item.innerHTML = `
            <div class="comment-header">
                <div class="comment-user">
                    <span>${escapeHtml(c.username)}</span>
                    ${roleBadge}
                </div>
                ${canDelete ? `<button type="button" class="btn-delete-comment" data-cid="${c.comment_id}">Delete</button>` : ""}
            </div>
            <div class="comment-body">${escapeHtml(c.text)}</div>
        `;

        if (canDelete) {
            const delBtn = item.querySelector(".btn-delete-comment");
            delBtn.addEventListener("click", () => handleDeleteComment(c.comment_id));
        }

        commentsList.appendChild(item);
    });
}

async function handleAddComment(e) {
    e.preventDefault();
    const text = commentText.value.trim();
    if (!text) return;

    submitCommentBtn.disabled = true;
    submitCommentBtn.textContent = "Posting...";

    try {
        const res = await fetch(`${BLOGS_API}/${postId}/comments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ text })
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || "Failed to post comment");
        }

        commentText.value = "";
        loadComments();
    } catch (err) {
        alert(err.message);
    } finally {
        submitCommentBtn.disabled = false;
        submitCommentBtn.textContent = "Post Comment";
    }
}

async function handleDeleteComment(commentId) {
    if (!confirm("Delete this comment?")) return;

    try {
        const res = await fetch(`${BLOGS_API}/${postId}/comments/${commentId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            loadComments();
        } else {
            const data = await res.json();
            alert(data.message || "Failed to delete comment");
        }
    } catch (err) {
        alert("Error: " + err.message);
    }
}

function escapeHtml(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
