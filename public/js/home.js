document.addEventListener("DOMContentLoaded", () => {

    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "/auth/login";
        return;
    }

    // Show Admin Panel link in navbar only for admins
    showAdminNavLink();

    document.getElementById("logoutBtn").addEventListener("click", () => {
        localStorage.removeItem("token");
        window.location.href = "/auth/login";
    });

});
