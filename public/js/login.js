const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        
        const response = await fetch("/api/auth/login", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Login failed");
            return;
        }


        localStorage.setItem("token", data.token);

        alert("Login successful");

        // setTimeout(() => {
        //     window.location.href = "/login.html";
        // }, 1000);

        // window.location.href = "/user/profile";
        window.location.href="/user/profile";

    } catch (error) {
        console.error(error);
        alert("Something went wrong");
    }
});