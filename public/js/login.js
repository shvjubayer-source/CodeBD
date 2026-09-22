const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const loginBtn = document.getElementById("loginBtn");

// If already logged in, redirect away from login page
if (localStorage.getItem("token")) {
    try {
        const base64 = localStorage.getItem("token").split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(atob(base64));
        // Check token hasn't expired
        if (payload.exp && payload.exp * 1000 > Date.now()) {
            window.location.href = payload.role === "admin" ? "/admin" : "/home";
        }
    } catch (_) {
        localStorage.removeItem("token");
    }
}

function showError(message) {
    loginError.textContent = message;
    loginError.style.display = "block";
}

function hideError() {
    loginError.style.display = "none";
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideError();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            showError(data.message || "Login failed. Please check your credentials.");
            return;
        }

        localStorage.setItem("token", data.token);

        // Decode the JWT payload to get the role (no signature verification needed on client)
        let role = "user";
        try {
            const base64 = data.token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
            const payload = JSON.parse(atob(base64));
            role = payload.role || "user";
        } catch (_) {
            // Malformed token — default to user redirect
        }

        if (role === "admin") {
            window.location.href = "/admin";
        } else {
            window.location.href = "/home";
        }

    } catch (error) {
        console.error(error);
        showError("Network error. Please check your connection and try again.");
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = "Login";
    }
});