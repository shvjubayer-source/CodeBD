
document.addEventListener("DOMContentLoaded", async () => {

    const logoutBtn = document.getElementById("logoutBtn");


    try {

        const token = localStorage.getItem("token");

        if (!token) {
            window.location.href = "/auth/login";
            return;
        }


    } catch (error) {

        console.error("Profile error:", error);

    }





    logoutBtn.addEventListener("click", async () => {

        try {

            logoutBtn.addEventListener("click", () => {
                localStorage.removeItem("token");

                window.location.href = "/auth/login";
            });

        } catch (error) {

            console.error("Logout error:", error);

        }

    });

});
