// ==========================================
// CodeBD User Profile & Performance Analytics
// ==========================================

const profileCharts = {};

function destroyProfileChart(key) {
    if (profileCharts[key]) {
        profileCharts[key].destroy();
        delete profileCharts[key];
    }
}

// Center Text Plugin for Doughnut Charts
const profileCenterTextPlugin = {
    id: "profileCenterText",
    beforeDraw(chart) {
        if (chart.config.type !== "doughnut") return;
        const { width, height, ctx } = chart;
        const total = chart.config.options?.plugins?.centerText?.total ?? "";
        const label = chart.config.options?.plugins?.centerText?.label ?? "";
        if (!total && !label) return;

        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const centerX = width / 2;
        const centerY = height / 2;

        ctx.font = "bold 1.45rem 'Inter', -apple-system, sans-serif";
        ctx.fillStyle = "#1e293b";
        ctx.fillText(total, centerX, centerY - 7);

        ctx.font = "600 0.72rem 'Inter', -apple-system, sans-serif";
        ctx.fillStyle = "#64748b";
        ctx.fillText(label, centerX, centerY + 13);

        ctx.restore();
    }
};

if (typeof Chart !== "undefined") {
    Chart.register(profileCenterTextPlugin);
    Chart.defaults.font.family = "'Inter', -apple-system, sans-serif";
}

document.addEventListener("DOMContentLoaded", async () => {
    const username = document.getElementById("username");
    const email = document.getElementById("email");
    const rating = document.getElementById("rating");
    const createdAt = document.getElementById("createdAt");
    const solveCount = document.getElementById("totalSolved");
    const logoutBtn = document.getElementById("logoutBtn");

    try {
        const token = localStorage.getItem("token");
        if (!token) {
            window.location.href = "/auth/login";
            return;
        }

        // Show Admin Panel link only for admins
        showAdminNavLink();

        // 1. Fetch User Profile Info
        const response = await fetch("/api/user/profile", {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` }
        });

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
        solveCount.textContent = data.solve_count;
        document.getElementById("headingName").textContent = data.username;

        const joinedDate = new Date(data.created_at);
        createdAt.textContent = joinedDate.toLocaleDateString();

        // 2. Fetch & Render User Performance Analytics
        loadUserAnalytics(token);

        // 3. Change Password Form
        const changePasswordForm = document.getElementById("changePasswordForm");
        const currentPasswordInput = document.getElementById("currentPassword");
        const newPasswordInput = document.getElementById("newPassword");
        const confirmPasswordInput = document.getElementById("confirmPassword");
        const updatePasswordBtn = document.getElementById("updatePasswordBtn");
        const passwordAlert = document.getElementById("passwordAlert");

        if (changePasswordForm) {
            changePasswordForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                passwordAlert.className = "hidden";
                passwordAlert.textContent = "";

                const currentPassword = currentPasswordInput.value;
                const newPassword = newPasswordInput.value;
                const confirmPassword = confirmPasswordInput.value;

                if (newPassword !== confirmPassword) {
                    passwordAlert.textContent = "New password and confirmation do not match.";
                    passwordAlert.style.background = "#fee2e2";
                    passwordAlert.style.color = "#dc2626";
                    passwordAlert.classList.remove("hidden");
                    return;
                }

                if (newPassword.length < 6) {
                    passwordAlert.textContent = "New password must be at least 6 characters.";
                    passwordAlert.style.background = "#fee2e2";
                    passwordAlert.style.color = "#dc2626";
                    passwordAlert.classList.remove("hidden");
                    return;
                }

                updatePasswordBtn.disabled = true;
                updatePasswordBtn.textContent = "Updating...";

                try {
                    const pRes = await fetch("/api/user/password", {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify({ currentPassword, newPassword })
                    });

                    const pData = await pRes.json();

                    if (!pRes.ok) {
                        throw new Error(pData.message || "Failed to update password");
                    }

                    passwordAlert.textContent = "Password updated successfully!";
                    passwordAlert.style.background = "#dcfce7";
                    passwordAlert.style.color = "#15803d";
                    passwordAlert.classList.remove("hidden");
                    changePasswordForm.reset();
                } catch (pErr) {
                    passwordAlert.textContent = pErr.message;
                    passwordAlert.style.background = "#fee2e2";
                    passwordAlert.style.color = "#dc2626";
                    passwordAlert.classList.remove("hidden");
                } finally {
                    updatePasswordBtn.disabled = false;
                    updatePasswordBtn.textContent = "Update Password";
                }
            });
        }

    } catch (error) {
        console.error("Profile error:", error);
        username.textContent = "Unable to load";
        email.textContent = "Unable to load";
        rating.textContent = "Unable to load";
        createdAt.textContent = "Unable to load";
    }

    // Logout
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("token");
        window.location.href = "/auth/login";
    });
});

// ==========================================
// LOAD & RENDER USER ANALYTICS CHARTS
// ==========================================
async function loadUserAnalytics(token) {
    try {
        const res = await fetch("/api/user/analytics", {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
            console.warn("Could not load user analytics telemetry:", res.status);
            return;
        }

        const json = await res.json();
        const analytics = json.data || {};

        updateUserKpis(analytics);
        renderUserRatingChart(analytics.ratingHistory || [], analytics.currentRating || 0);
        renderUserDifficultyChart(analytics.solvesByDifficulty || []);
        renderUserVerdictChart(analytics.verdictDistribution || []);

    } catch (err) {
        console.error("loadUserAnalytics error:", err);
    }
}

// ── Update Profile KPI Mini Cards ──
function updateUserKpis(data) {
    const rating = Number(data.currentRating) || 0;
    const ratingHistory = data.ratingHistory || [];
    const diffs = data.solvesByDifficulty || [];
    const verdicts = data.verdictDistribution || [];

    // Current Rating & Tier
    const ratingEl = document.getElementById("userKpiRating");
    const tierEl = document.getElementById("userKpiTier");
    if (ratingEl) ratingEl.textContent = rating;
    if (tierEl) {
        let tierName = "Newbie";
        if (rating >= 1800) tierName = "Expert";
        else if (rating >= 1400) tierName = "Specialist";
        else if (rating >= 1000) tierName = "Pupil";
        tierEl.textContent = `${tierName} Tier`;
    }

    // Peak Rating & Contests
    const peakRating = ratingHistory.reduce((max, h) => {
        const r = Number(h.new_rating);
        return r > max ? r : max;
    }, rating);

    const peakEl = document.getElementById("userKpiPeak");
    const contestsEl = document.getElementById("userKpiContests");
    if (peakEl) peakEl.textContent = peakRating;
    if (contestsEl) contestsEl.textContent = `${ratingHistory.length} Contest${ratingHistory.length === 1 ? "" : "s"} Played`;

    // Problems Solved & Hard Solves
    const totalSolved = diffs.reduce((acc, d) => acc + Number(d.count), 0);
    const hardSolved = Number(diffs.find(d => d.difficulty?.toLowerCase() === "hard")?.count) || 0;
    const solvedEl = document.getElementById("userKpiSolved");
    const hardEl = document.getElementById("userKpiHard");
    if (solvedEl) solvedEl.textContent = totalSolved;
    if (hardEl) hardEl.textContent = `${hardSolved} Hard Solves`;

    // Acceptance Rate & Total Submissions
    const totalSubs = verdicts.reduce((acc, v) => acc + Number(v.count), 0);
    const acceptedSubs = Number(verdicts.find(v => v.verdict === "Accepted")?.count) || 0;
    const accRate = totalSubs > 0 ? ((acceptedSubs / totalSubs) * 100).toFixed(1) : "0.0";
    const accEl = document.getElementById("userKpiAccuracy");
    const subsEl = document.getElementById("userKpiSubs");
    if (accEl) accEl.textContent = `${accRate}%`;
    if (subsEl) subsEl.textContent = `${totalSubs} Submissions`;
}

// ── 1. User Rating Progression Chart ──
function renderUserRatingChart(history, currentRating) {
    destroyProfileChart("userRating");
    const canvas = document.getElementById("userRatingChart");
    const emptyState = document.getElementById("ratingEmptyState");
    if (!canvas) return;

    if (!history || history.length === 0) {
        if (emptyState) emptyState.style.display = "flex";
        canvas.style.display = "none";
        return;
    }

    if (emptyState) emptyState.style.display = "none";
    canvas.style.display = "block";

    const ctx = canvas.getContext("2d");
    const labels = history.map(h => h.contest_date || h.contest_title || "Contest");
    const ratings = history.map(h => Number(h.new_rating));

    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, "rgba(99, 102, 241, 0.45)");
    gradient.addColorStop(1, "rgba(99, 102, 241, 0.0)");

    profileCharts.userRating = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Contest Rating",
                data: ratings,
                borderColor: "#6366f1",
                backgroundColor: gradient,
                fill: true,
                tension: 0.3,
                borderWidth: 3,
                pointBackgroundColor: "#4338ca",
                pointBorderColor: "#ffffff",
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "#0f172a",
                    titleColor: "#f8fafc",
                    bodyColor: "#cbd5e1",
                    borderColor: "rgba(255, 255, 255, 0.12)",
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        title: (items) => {
                            const idx = items[0]?.dataIndex;
                            const h = history[idx];
                            return h?.contest_title || `Contest #${h?.contest_id}`;
                        },
                        label: (item) => ` Rating: ${item.raw}`,
                        afterLabel: (item) => {
                            const idx = item.dataIndex;
                            const h = history[idx];
                            const change = Number(h?.rating_change) || 0;
                            const deltaStr = change > 0 ? `+${change}` : `${change}`;
                            return ` Change: ${deltaStr} • Solves: ${h?.solve_count || 0} • Score: ${h?.score || 0}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: "rgba(148, 163, 184, 0.1)" },
                    ticks: { color: "#64748b", font: { size: 11 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: "#64748b", font: { size: 11 } }
                }
            }
        }
    });

    const badge = document.getElementById("ratingProgressionBadge");
    if (badge) {
        badge.textContent = `${history.length} Contests Evaluated`;
    }
}

// ── 2. Solved Problems by Difficulty Chart ──
function renderUserDifficultyChart(diffs) {
    destroyProfileChart("userDifficulty");
    const canvas = document.getElementById("userDifficultyChart");
    const emptyState = document.getElementById("difficultyEmptyState");
    if (!canvas) return;

    const totalSolves = diffs.reduce((acc, d) => acc + Number(d.count), 0);

    if (totalSolves === 0) {
        if (emptyState) emptyState.style.display = "flex";
        canvas.style.display = "none";
        return;
    }

    if (emptyState) emptyState.style.display = "none";
    canvas.style.display = "block";

    const ctx = canvas.getContext("2d");
    const diffColorMap = {
        "Easy": "#10b981",
        "Medium": "#f59e0b",
        "Hard": "#ef4444"
    };

    const labels = diffs.map(d => d.difficulty);
    const counts = diffs.map(d => Number(d.count));
    const colors = labels.map(l => diffColorMap[l] || "#6366f1");

    profileCharts.userDifficulty = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels,
            datasets: [{
                data: counts,
                backgroundColor: colors,
                borderColor: "#ffffff",
                borderWidth: 3,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "right",
                    labels: { boxWidth: 12, boxHeight: 12, usePointStyle: true, color: "#334155", font: { size: 12 } }
                },
                tooltip: {
                    backgroundColor: "#0f172a",
                    titleColor: "#f8fafc",
                    bodyColor: "#cbd5e1",
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: (item) => {
                            const val = item.raw;
                            const pct = totalSolves > 0 ? ((val / totalSolves) * 100).toFixed(1) : 0;
                            return ` ${item.label}: ${val} (${pct}%)`;
                        }
                    }
                },
                centerText: { total: String(totalSolves), label: "Solved" }
            },
            cutout: "70%"
        }
    });
}

// ── 3. Submissions Verdict Distribution Chart ──
function renderUserVerdictChart(verdicts) {
    destroyProfileChart("userVerdict");
    const canvas = document.getElementById("userVerdictChart");
    const emptyState = document.getElementById("verdictEmptyState");
    if (!canvas) return;

    const totalSubs = verdicts.reduce((acc, v) => acc + Number(v.count), 0);

    if (totalSubs === 0) {
        if (emptyState) emptyState.style.display = "flex";
        canvas.style.display = "none";
        return;
    }

    if (emptyState) emptyState.style.display = "none";
    canvas.style.display = "block";

    const ctx = canvas.getContext("2d");
    const verdictColorMap = {
        "Accepted": "#10b981",
        "Wrong Answer": "#ef4444",
        "Time Limit Exceeded": "#f59e0b",
        "Memory Limit Exceeded": "#ec4899",
        "Compilation Error": "#a855f7",
        "Runtime Error": "#f97316",
        "Pending": "#3b82f6"
    };

    const labels = verdicts.map(v => v.verdict);
    const counts = verdicts.map(v => Number(v.count));
    const colors = labels.map(l => verdictColorMap[l] || "#94a3b8");

    profileCharts.userVerdict = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels,
            datasets: [{
                data: counts,
                backgroundColor: colors,
                borderColor: "#ffffff",
                borderWidth: 3,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "right",
                    labels: { boxWidth: 12, boxHeight: 12, usePointStyle: true, color: "#334155", font: { size: 12 } }
                },
                tooltip: {
                    backgroundColor: "#0f172a",
                    titleColor: "#f8fafc",
                    bodyColor: "#cbd5e1",
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: (item) => {
                            const val = item.raw;
                            const pct = totalSubs > 0 ? ((val / totalSubs) * 100).toFixed(1) : 0;
                            return ` ${item.label}: ${val} (${pct}%)`;
                        }
                    }
                },
                centerText: { total: String(totalSubs), label: "Runs" }
            },
            cutout: "70%"
        }
    });
}
