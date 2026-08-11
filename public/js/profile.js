
document.addEventListener("DOMContentLoaded", async () => {

    const username = document.getElementById("username");
    const email = document.getElementById("email");
    const rating = document.getElementById("rating");
    const createdAt = document.getElementById("createdAt");
    const solveCount=document.getElementById("totalSolved");

    const logoutBtn = document.getElementById("logoutBtn");


    try {

        const token = localStorage.getItem("token");

        if (!token) {
            window.location.href = "/auth/login";
            return;
        }

        const response = await fetch("/api/user/profile", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });


        // User is not logged in
        if (response.status === 401 || response.status === 403) {
            window.location.href = "/auth/login";
            return;
        }


        if (!response.ok) {
            throw new Error("Failed to load profile");
        }


        const data = await response.json();


        username.textContent = data.username;
        email.textContent = data.email;
        rating.textContent = data.rating;
        solveCount.textContent=data.solve_count;

        document.getElementById("headingName").textContent=data.username;

        const joinedDate = new Date(data.created_at);

        createdAt.textContent = joinedDate.toLocaleDateString();


    } catch (error) {

        console.error("Profile error:", error);

        username.textContent = "Unable to load";
        email.textContent = "Unable to load";
        rating.textContent = "Unable to load";
        createdAt.textContent = "Unable to load";
    }



    // logout

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
