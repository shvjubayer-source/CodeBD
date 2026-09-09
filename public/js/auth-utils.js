/**
 * auth-utils.js  — shared client-side auth helpers
 * Included in every page that needs role awareness.
 */

/**
 * Decode the JWT payload from localStorage (no signature check –
 * verification happens on the server).
 * Returns null if token is missing or malformed.
 */
function getTokenPayload() {
    try {
        const token = localStorage.getItem("token");
        if (!token) return null;
        const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        return JSON.parse(atob(base64));
    } catch {
        return null;
    }
}

/** Returns the role string ("admin" | "user") or null */
function getUserRole() {
    const payload = getTokenPayload();
    return payload ? payload.role : null;
}

/**
 * Show the Admin Panel link in the navbar only if the current user
 * has the "admin" role.
 * The nav element must have:  <a id="adminNavLink" href="/admin">Admin Panel</a>
 */
function showAdminNavLink() {
    const link = document.getElementById("adminNavLink");
    if (!link) return;
    if (getUserRole() === "admin") {
        link.style.display = "";       // show
    } else {
        link.style.display = "none";   // hide
    }
}

/**
 * Guard for admin-only pages.
 * If the user is not an admin, redirect immediately to /home.
 * Call this at the top of every admin page JS.
 */
function requireAdmin() {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "/auth/login";
        return;
    }
    if (getUserRole() !== "admin") {
        window.location.href = "/home";
    }
}
