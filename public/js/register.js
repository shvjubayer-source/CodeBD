const registerForm = document.getElementById("registerForm");
const registerError = document.getElementById("registerError");
const registerBtn = document.getElementById("registerBtn");

// If already logged in, redirect away from register page
if (localStorage.getItem("token")) {
    window.location.href = "/home";
}

function showError(msg) {
    if (!registerError) return;
    registerError.className = "form-error";
    registerError.textContent = msg;
    registerError.style.display = "block";
}

function showSuccess(msg) {
    if (!registerError) return;
    registerError.className = "form-success";
    registerError.textContent = msg;
    registerError.style.display = "block";
}

function hideMessage() {
    if (!registerError) return;
    registerError.style.display = "none";
    registerError.textContent = "";
}

// Clear message when user types
["username", "email", "password"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener("input", hideMessage);
    }
});

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideMessage();

    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !email || !password) {
        showError("All fields are required.");
        return;
    }

    if (password.length < 6) {
        showError("Password must be at least 6 characters long.");
        return;
    }

    if (registerBtn) {
        registerBtn.disabled = true;
        registerBtn.textContent = "Creating account...";
    }

    try {
        const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username,
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            showError(data.message || "Registration failed. Please try again.");
            if (registerBtn) {
                registerBtn.disabled = false;
                registerBtn.textContent = "Register";
            }
            return;
        }

        showSuccess("Account created successfully! Redirecting to login...");

        setTimeout(() => {
            window.location.href = "/auth/login";
        }, 1200);

    } catch (error) {
        console.error("Registration error:", error);
        showError("Unable to connect to the server. Please check your connection.");
        if (registerBtn) {
            registerBtn.disabled = false;
            registerBtn.textContent = "Register";
        }
    }
});