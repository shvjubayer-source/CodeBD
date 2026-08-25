const submissionTableBody = document.getElementById("submissionTableBody");
const totalSubmissions = document.getElementById("totalSubmissions");
const usernameElement = document.getElementById("username");
const logoutBtn = document.getElementById("logoutBtn");


/* =========================
GET TOKEN
========================= */

const token = localStorage.getItem("token");


/* =========================
CHECK LOGIN
========================= */

if (!token) {
    window.location.href = "/auth/login";
}


/* =========================
LOAD SUBMISSIONS
========================= */

async function loadSubmissions() {

    try {

        const response = await fetch("/api/submissions", {

            method: "GET",

            headers: {
                "Authorization": `Bearer ${token}`
            }

        });


        /* =========================
        INVALID / EXPIRED TOKEN
        ========================= */

        if (response.status === 401 || response.status === 403) {

            localStorage.removeItem("token");

            window.location.href = "/auth/login";

            return;
        }


        if (!response.ok) {

            throw new Error("Could not fetch submissions");

        }


        const submissions = await response.json();


        /* =========================
        TOTAL SUBMISSIONS
        ========================= */

        totalSubmissions.textContent = submissions.length;


        /* =========================
        CLEAR TABLE
        ========================= */

        submissionTableBody.innerHTML = "";


        /* =========================
        NO SUBMISSIONS
        ========================= */

        if (submissions.length === 0) {

            submissionTableBody.innerHTML = `

                <tr>

                    <td
                        colspan="7"
                        style="
                            text-align: center;
                            padding: 40px;
                            color: #9ca3af;
                        "
                    >
                        You haven't made any submissions yet.
                    </td>

                </tr>

            `;

            return;
        }


        /* =========================
        SORT NEWEST FIRST
        ========================= */

        submissions.sort((a, b) => {

            return new Date(b.submitted_at)
                - new Date(a.submitted_at);

        });


        /* =========================
        DISPLAY SUBMISSIONS
        ========================= */

        submissions.forEach((submission, index) => {

            const row = document.createElement("tr");


            row.innerHTML = `

                <td class="submission-id">

                    ${index + 1}

                </td>


                <td class="submission-date">

                    ${formatDate(submission.submitted_at)}

                    <span>
                        ${formatTime(submission.submitted_at)}
                    </span>

                </td>


                <td>

                    <a
                        href="/problems/${submission.problem_id}"
                        class="problem-name"
                    >

                        ${submission.problem_name}

                    </a>

                </td>


                <td>

                    <span class="language">

                        ${submission.language}

                    </span>

                </td>


                <td>

                    <span
                        class="verdict ${getVerdictClass(
                            submission.verdict
                        )}"
                    >

                        ${submission.verdict}

                    </span>

                </td>


                <td>

                    ${
                        submission.execution_time !== null
                            ? `${submission.execution_time} ms`
                            : "—"
                    }

                </td>


                <td>

                    ${
                        submission.memory_used !== null
                            ? formatMemory(submission.memory_used)
                            : "—"
                    }

                </td>

            `;


            submissionTableBody.appendChild(row);

        });

    }

    catch (error) {

        console.error(
            "Submission loading error:",
            error
        );


        submissionTableBody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    style="
                        text-align: center;
                        padding: 40px;
                        color: #dc2626;
                    "
                >
                    Failed to load submissions.
                </td>

            </tr>

        `;

    }

}


/* =========================
FORMAT DATE
========================= */

function formatDate(dateString) {

    const date = new Date(dateString);


    return date.toLocaleDateString(
        "en-US",
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );

}


/* =========================
FORMAT TIME
========================= */

function formatTime(dateString) {

    const date = new Date(dateString);


    return date.toLocaleTimeString(
        "en-US",
        {
            hour: "numeric",
            minute: "2-digit"
        }
    );

}


/* =========================
FORMAT MEMORY
========================= */

function formatMemory(memory) {

    const memoryInMB = memory / 1024;

    return `${memoryInMB.toFixed(2)} MB`;

}


/* =========================
VERDICT CSS CLASS
========================= */

function getVerdictClass(verdict) {

    switch (verdict) {

        case "Accepted":
            return "accepted";

        case "Wrong Answer":
            return "wrong-answer";

        case "Time Limit Exceeded":
            return "time-limit";

        case "Memory Limit Exceeded":
            return "memory-limit";

        case "Runtime Error":
            return "runtime-error";

        case "Compilation Error":
            return "compilation-error";

        case "Pending":
            return "pending";

        default:
            return "pending";

    }

}


/* =========================
LOGOUT
========================= */

logoutBtn.addEventListener("click", function () {

    localStorage.removeItem("token");

    window.location.href = "/auth/login";

});


/* =========================
LOAD PAGE
========================= */

loadSubmissions();