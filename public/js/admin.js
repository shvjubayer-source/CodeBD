// ==========================================
// GUARD — redirect non-admins immediately
// (requireAdmin & showAdminNavLink from auth-utils.js)
// ==========================================
requireAdmin();
showAdminNavLink();

// ==========================================
// AUTH HELPERS
// ==========================================
function getToken()    { return localStorage.getItem("token"); }
function authHeaders() { return { "Authorization": `Bearer ${getToken()}`, "Content-Type": "application/json" }; }
function handleUnauth(status) {
    if (status === 401) { localStorage.removeItem("token"); window.location.href = "/auth/login"; return true; }
    return false;
}
function logout() {
    fetch("/api/auth/logout", { method: "POST", headers: authHeaders() }).catch(()=>{});
    localStorage.removeItem("token");
    window.location.href = "/auth/login";
}

document.getElementById("logoutBtn").addEventListener("click", logout);

// Sidebar analytics smooth scroll
const sidebarAnalytics = document.getElementById("sidebarAnalytics");
if (sidebarAnalytics) {
    sidebarAnalytics.addEventListener("click", (e) => {
        e.preventDefault();
        const section = document.getElementById("analyticsSection");
        if (section) {
            section.scrollIntoView({ behavior: "smooth" });
        }
    });
}

// ==========================================
// CHART INSTANCES, CACHE & UI STATE
// ==========================================
const charts = {};
let focusChartInstance = null;
let cachedAnalyticsData = null;

// UI Interactive State
let growthMode = "both";
let solvesDiffFilter = "all";
let solvesSortMode = "desc";
let attemptsViewMode = "grouped";
let verdictChartType = "doughnut";
let langChartType = "doughnut";
let contestChartType = "bar";
let ratingTierChartType = "bar";
let difficultyChartType = "bar";
let dailySubsChartType = "line";
let activeSearchQuery = "";

function destroyChart(key) {
    if (charts[key]) {
        charts[key].destroy();
        delete charts[key];
    }
}

// Global Chart.js styling
Chart.defaults.color = "#94a3b8";
Chart.defaults.borderColor = "rgba(148, 163, 184, 0.08)";
Chart.defaults.font.family = "'Inter', -apple-system, sans-serif";

const commonTooltip = {
    backgroundColor: "#0f172a",
    titleColor: "#f8fafc",
    bodyColor: "#cbd5e1",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    padding: 12,
    boxPadding: 6,
    cornerRadius: 10,
    usePointStyle: true,
};

// Canvas Gradient Generators
function createVerticalGradient(ctx, topColor, bottomColor, height = 300) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, topColor);
    gradient.addColorStop(1, bottomColor);
    return gradient;
}

// Center Text Plugin for Doughnut Charts
const centerTextPlugin = {
    id: "centerText",
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

        ctx.font = "bold 1.55rem 'Inter', sans-serif";
        ctx.fillStyle = "#f8fafc";
        ctx.fillText(total, centerX, centerY - 8);

        ctx.font = "600 0.74rem 'Inter', sans-serif";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(label, centerX, centerY + 14);

        ctx.restore();
    }
};
Chart.register(centerTextPlugin);

// Animated Numeric Counter Helper
function animateCounter(elementId, targetValue, duration = 800, prefix = "", suffix = "", isFloat = false) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const start = 0;
    const startTime = performance.now();
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = start + (targetValue - start) * ease;
        el.textContent = `${prefix}${isFloat ? current.toFixed(1) : Math.round(current).toLocaleString()}${suffix}`;
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            el.textContent = `${prefix}${isFloat ? targetValue.toFixed(1) : targetValue.toLocaleString()}${suffix}`;
        }
    }
    requestAnimationFrame(update);
}

// Modal Helpers
function openModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.style.display = "flex";
    document.body.style.overflow = "hidden";
}
function closeModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.style.display = "none";
    document.body.style.overflow = "";
}

// ==========================================
// LOAD STATS COUNTERS
// ==========================================
async function loadStats() {
    try {
        const res = await fetch("/api/admin", { headers: authHeaders() });
        if (handleUnauth(res.status)) return;
        if (!res.ok) return;
        const json = await res.json();
        const counts = json.data || json;
        document.getElementById("totalProblems").textContent    = counts.totalProblems    ?? "—";
        document.getElementById("totalContests").textContent    = counts.totalContests    ?? "—";
        document.getElementById("totalUsers").textContent       = counts.totalUsers       ?? "—";
        document.getElementById("totalSubmissions").textContent = counts.totalSubmissions ?? "—";
    } catch(e) { console.error("loadStats error:", e); }
}

// ==========================================
// LOAD & RENDER ANALYTICS
// ==========================================
async function loadAnalytics() {
    try {
        const res = await fetch("/api/admin/analytics", { headers: authHeaders() });
        if (handleUnauth(res.status)) return;
        if (!res.ok) {
            console.error("Failed to load analytics data:", res.status);
            return;
        }
        const json = await res.json();
        cachedAnalyticsData = json.data || {};

        const now = new Date();
        const syncEl = document.getElementById("lastSyncTime");
        if (syncEl) syncEl.textContent = `Synced at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

        updateKpiRibbon(cachedAnalyticsData);
        renderAllCharts();

    } catch (err) {
        console.error("loadAnalytics error:", err);
    }
}

// ── Update Executive KPI Ribbon & Mini Badges ──
function updateKpiRibbon(data) {
    const verdicts = data.verdictDistribution || [];
    const langs = data.languageDistribution || [];
    const problems = data.problemSolveStats || [];
    const contests = data.contestParticipation || [];
    const growth = data.registrationsOverTime || [];
    const diffs = data.difficultyDistribution || [];

    // Acceptance Rate
    const totalSubs = verdicts.reduce((acc, v) => acc + Number(v.count), 0);
    const acceptedSubs = Number(verdicts.find(v => v.verdict === "Accepted")?.count) || 0;
    const rate = totalSubs > 0 ? (acceptedSubs / totalSubs) * 100 : 0;
    animateCounter("kpiAcceptance", rate, 900, "", "%", true);
    document.getElementById("kpiAcceptanceSub").textContent = `${acceptedSubs} of ${totalSubs} Accepted`;

    // Top Language
    if (langs.length > 0) {
        const topLang = langs[0];
        const langShare = totalSubs > 0 ? ((Number(topLang.count) / totalSubs) * 100).toFixed(0) : 0;
        document.getElementById("kpiLanguage").textContent = topLang.language;
        document.getElementById("kpiLanguageSub").textContent = `${langShare}% of submissions (${topLang.count})`;
        document.getElementById("badgeLanguages").textContent = `${langs.length} Active (${topLang.language} #1)`;
    }

    // Top Solved Problem
    if (problems.length > 0) {
        const topProb = problems[0];
        document.getElementById("kpiTopProblem").textContent = topProb.title;
        document.getElementById("kpiTopProblemSub").textContent = `${topProb.solve_count} solvers (${topProb.difficulty})`;
        document.getElementById("badgeSolves").textContent = `Top: ${topProb.title.slice(0, 12)}… (${topProb.solve_count})`;
    }

    // Top Contest
    if (contests.length > 0) {
        const topContest = contests[0];
        document.getElementById("kpiTopContest").textContent = topContest.title;
        document.getElementById("kpiTopContestSub").textContent = `${topContest.participant_count} coders registered`;
        document.getElementById("badgeContests").textContent = `Max: ${topContest.participant_count} Coders`;
    }

    // User Growth Mini Badge
    const totalCoders = growth.reduce((acc, g) => acc + Number(g.count), 0);
    const peakDay = growth.reduce((max, g) => Number(g.count) > max ? Number(g.count) : max, 0);
    document.getElementById("badgeGrowth").textContent = `${totalCoders} Total • Peak ${peakDay}/day`;

    // Verdicts Mini Badge
    document.getElementById("badgeVerdicts").textContent = `${verdicts.length} Outcomes • ${rate.toFixed(1)}% Acc`;

    // Attempts Mini Badge
    const totalSolvedSum = problems.reduce((acc, p) => acc + Number(p.solve_count), 0);
    const avgPlatformRatio = totalSubs > 0 && totalSolvedSum > 0 ? (totalSubs / totalSolvedSum).toFixed(1) : "1.0";
    document.getElementById("badgeAttempts").textContent = `~${avgPlatformRatio} Subs/Solve Ratio`;

    // Catalog Spread Badge
    const totalProblemsInCatalog = diffs.reduce((acc, d) => acc + Number(d.count), 0);
    document.getElementById("badgeCatalog").textContent = `${totalProblemsInCatalog} Total Catalog Problems`;

    // Ratings Mini Badge
    const ratings = data.ratingDistribution || [];
    const totalRated = ratings.reduce((acc, r) => acc + Number(r.count), 0);
    document.getElementById("badgeRatings").textContent = `${totalRated} Evaluated Coders`;

    // Daily Submissions Mini Badge
    const dailySubs = data.dailySubmissions || [];
    const totalDailySubs = dailySubs.reduce((acc, s) => acc + Number(s.count), 0);
    const peakSubsDay = dailySubs.reduce((max, s) => Number(s.count) > max ? Number(s.count) : max, 0);
    const badgeDailySubsEl = document.getElementById("badgeDailySubs");
    if (badgeDailySubsEl) {
        badgeDailySubsEl.textContent = `${totalDailySubs} Total • Peak ${peakSubsDay}/day`;
    }
}

function renderAllCharts() {
    if (!cachedAnalyticsData) return;
    renderUserGrowthChart(cachedAnalyticsData.registrationsOverTime || []);
    renderProblemSolvesChart(cachedAnalyticsData.problemSolveStats || []);
    renderAttemptsChart(cachedAnalyticsData.problemSolveStats || []);
    renderVerdictsChart(cachedAnalyticsData.verdictDistribution || []);
    renderLanguagesChart(cachedAnalyticsData.languageDistribution || []);
    renderContestsChart(cachedAnalyticsData.contestParticipation || []);
    renderRatingTiersChart(cachedAnalyticsData.ratingDistribution || []);
    renderDifficultyChart(cachedAnalyticsData.difficultyDistribution || []);
    renderDailySubmissionsChart(cachedAnalyticsData.dailySubmissions || []);
}

// ── 1. User Growth Over Time (Area + Bar) ──
function renderUserGrowthChart(rawData) {
    destroyChart("userGrowth");
    const ctx = document.getElementById("chartUserGrowth")?.getContext("2d");
    if (!ctx) return;

    if (!rawData.length) {
        rawData = [{ date: "Today", count: 0 }];
    }

    let runningTotal = 0;
    const labels = rawData.map(d => d.date);
    const dailyCounts = rawData.map(d => Number(d.count));
    const cumulativeCounts = dailyCounts.map(c => (runningTotal += c));

    const gradient = createVerticalGradient(ctx, "rgba(99, 102, 241, 0.5)", "rgba(99, 102, 241, 0.0)", 290);

    const datasets = [];

    if (growthMode === "both" || growthMode === "cumulative") {
        datasets.push({
            type: "line",
            label: "Cumulative Coders",
            data: cumulativeCounts,
            borderColor: "#818cf8",
            backgroundColor: gradient,
            fill: true,
            tension: 0.36,
            borderWidth: 3,
            pointBackgroundColor: "#4f46e5",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
            order: 1
        });
    }

    if (growthMode === "both" || growthMode === "daily") {
        const barGradient = createVerticalGradient(ctx, "#38bdf8", "rgba(56, 189, 248, 0.25)", 280);
        datasets.push({
            type: "bar",
            label: "New Registrations",
            data: dailyCounts,
            backgroundColor: barGradient,
            borderRadius: 8,
            barThickness: 28,
            order: 2
        });
    }

    charts.userGrowth = new Chart(ctx, {
        type: "line",
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            onHover: (e, el) => { e.native.target.style.cursor = el && el.length ? "pointer" : "default"; },
            plugins: {
                legend: { position: "top", labels: { boxWidth: 14, boxHeight: 14, usePointStyle: true } },
                tooltip: commonTooltip
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 },
                    grid: { color: "rgba(148, 163, 184, 0.08)" }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

// ── 2. Solves per Problem (Horizontal Bar with Diff & Sort Filters) ──
function renderProblemSolvesChart(problems) {
    destroyChart("problemSolves");
    const ctx = document.getElementById("chartProblemSolves")?.getContext("2d");
    if (!ctx) return;

    let filtered = [...problems];

    // Search filter
    if (activeSearchQuery) {
        filtered = filtered.filter(p => p.title.toLowerCase().includes(activeSearchQuery) || p.difficulty?.toLowerCase().includes(activeSearchQuery));
    }

    // Difficulty filter
    if (solvesDiffFilter !== "all") {
        filtered = filtered.filter(p => p.difficulty?.toLowerCase() === solvesDiffFilter.toLowerCase());
    }

    // Sort mode
    if (solvesSortMode === "desc") {
        filtered.sort((a, b) => Number(b.solve_count) - Number(a.solve_count));
    } else if (solvesSortMode === "asc") {
        filtered.sort((a, b) => Number(a.solve_count) - Number(b.solve_count));
    } else if (solvesSortMode === "alpha") {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    const labels = filtered.map(p => p.title.length > 20 ? p.title.slice(0, 18) + "…" : p.title);
    const solves = filtered.map(p => Number(p.solve_count) || 0);

    const barGradient = createVerticalGradient(ctx, "#34d399", "#059669", 300);

    charts.problemSolves = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Unique Solvers",
                data: solves,
                backgroundColor: barGradient,
                borderRadius: 7,
                borderSkipped: false
            }]
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            onHover: (e, el) => { e.native.target.style.cursor = el && el.length ? "pointer" : "default"; },
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    openDrilldownProblem(filtered[idx]);
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    ...commonTooltip,
                    callbacks: {
                        afterLabel: function(item) {
                            const p = filtered[item.dataIndex];
                            return p ? `Difficulty: ${p.difficulty} • Total Subs: ${p.total_submissions}\n(Click to inspect deep dive)` : "";
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { precision: 0 },
                    grid: { color: "rgba(148, 163, 184, 0.08)" }
                },
                y: {
                    grid: { display: false }
                }
            }
        }
    });
}

// ── 3. Submissions vs Solvers (Grouped / Stacked Bar) ──
function renderAttemptsChart(problems) {
    destroyChart("problemAttempts");
    const ctx = document.getElementById("chartProblemAttempts")?.getContext("2d");
    if (!ctx) return;

    let filtered = [...problems];
    if (activeSearchQuery) {
        filtered = filtered.filter(p => p.title.toLowerCase().includes(activeSearchQuery));
    }

    const labels = filtered.map(p => p.title.length > 18 ? p.title.slice(0, 16) + "…" : p.title);
    const submissions = filtered.map(p => Number(p.total_submissions) || 0);
    const solvers = filtered.map(p => Number(p.solve_count) || 0);

    const subGrad = createVerticalGradient(ctx, "#818cf8", "#4338ca", 280);
    const solGrad = createVerticalGradient(ctx, "#34d399", "#059669", 280);

    charts.problemAttempts = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "Total Submissions",
                    data: submissions,
                    backgroundColor: subGrad,
                    borderRadius: 6,
                    stack: attemptsViewMode === "stacked" ? "stack0" : undefined
                },
                {
                    label: "Accepted Solvers",
                    data: solvers,
                    backgroundColor: solGrad,
                    borderRadius: 6,
                    stack: attemptsViewMode === "stacked" ? "stack0" : undefined
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onHover: (e, el) => { e.native.target.style.cursor = el && el.length ? "pointer" : "default"; },
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    openDrilldownProblem(filtered[idx]);
                }
            },
            plugins: {
                legend: { position: "top", labels: { boxWidth: 12, boxHeight: 12, usePointStyle: true } },
                tooltip: {
                    ...commonTooltip,
                    callbacks: {
                        afterBody: function(items) {
                            const index = items[0].dataIndex;
                            const p = filtered[index];
                            if (p && p.avg_attempts) {
                                return `⚡ Avg. attempts per solver: ${p.avg_attempts}\n(Click to inspect deep dive)`;
                            }
                            return "No accepted solutions yet";
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 },
                    grid: { color: "rgba(148, 163, 184, 0.08)" }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

// ── 4. Submission Verdicts (Doughnut / PolarArea / Bar) ──
function renderVerdictsChart(verdicts) {
    destroyChart("verdicts");
    const ctx = document.getElementById("chartVerdicts")?.getContext("2d");
    if (!ctx) return;

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
    const total = counts.reduce((a, b) => a + b, 0);

    const clickHandler = (evt, elements) => {
        if (elements.length > 0) {
            const idx = elements[0].index;
            openDrilldownVerdict(verdicts[idx], total);
        }
    };

    if (verdictChartType === "doughnut") {
        charts.verdicts = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels,
                datasets: [{
                    data: counts,
                    backgroundColor: colors,
                    borderColor: "#1e293b",
                    borderWidth: 3,
                    hoverOffset: 12
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onHover: (e, el) => { e.native.target.style.cursor = el && el.length ? "pointer" : "default"; },
                onClick: clickHandler,
                plugins: {
                    legend: { position: "right", labels: { boxWidth: 12, boxHeight: 12, usePointStyle: true } },
                    tooltip: {
                        ...commonTooltip,
                        callbacks: {
                            label: function(item) {
                                const val = item.raw;
                                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                                return ` ${item.label}: ${val} (${pct}%) • Click to inspect`;
                            }
                        }
                    },
                    centerText: { total: String(total), label: "Total Subs" }
                },
                cutout: "70%"
            }
        });
    } else if (verdictChartType === "polarArea") {
        charts.verdicts = new Chart(ctx, {
            type: "polarArea",
            data: {
                labels,
                datasets: [{
                    data: counts,
                    backgroundColor: colors.map(c => c + "cc"),
                    borderColor: "#1e293b",
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onHover: (e, el) => { e.native.target.style.cursor = el && el.length ? "pointer" : "default"; },
                onClick: clickHandler,
                plugins: {
                    legend: { position: "right", labels: { boxWidth: 12, boxHeight: 12, usePointStyle: true } },
                    tooltip: commonTooltip
                },
                scales: {
                    r: { grid: { color: "rgba(148, 163, 184, 0.08)" }, ticks: { display: false } }
                }
            }
        });
    } else {
        charts.verdicts = new Chart(ctx, {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "Count",
                    data: counts,
                    backgroundColor: colors,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onHover: (e, el) => { e.native.target.style.cursor = el && el.length ? "pointer" : "default"; },
                onClick: clickHandler,
                plugins: {
                    legend: { display: false },
                    tooltip: commonTooltip
                },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "rgba(148, 163, 184, 0.08)" } },
                    x: { grid: { display: false } }
                }
            }
        });
    }
}

// ── 5. Programming Languages (Doughnut / Pie / Bar) ──
function renderLanguagesChart(languages) {
    destroyChart("languages");
    const ctx = document.getElementById("chartLanguages")?.getContext("2d");
    if (!ctx) return;

    const langColorMap = {
        "cpp": "#0284c7",
        "C++": "#0284c7",
        "C++17": "#0284c7",
        "python": "#eab308",
        "Python": "#eab308",
        "java": "#f97316",
        "Java": "#f97316",
        "javascript": "#22c55e",
        "JavaScript": "#22c55e",
        "c": "#64748b"
    };

    const labels = languages.map(l => l.language);
    const counts = languages.map(l => Number(l.count));
    const colors = labels.map(l => langColorMap[l] || "#8b5cf6");
    const total = counts.reduce((a, b) => a + b, 0);

    const clickHandler = (evt, elements) => {
        if (elements.length > 0) {
            const idx = elements[0].index;
            openDrilldownLanguage(languages[idx], total);
        }
    };

    if (langChartType === "doughnut" || langChartType === "pie") {
        charts.languages = new Chart(ctx, {
            type: langChartType,
            data: {
                labels,
                datasets: [{
                    data: counts,
                    backgroundColor: colors,
                    borderColor: "#1e293b",
                    borderWidth: 3,
                    hoverOffset: 12
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onHover: (e, el) => { e.native.target.style.cursor = el && el.length ? "pointer" : "default"; },
                onClick: clickHandler,
                plugins: {
                    legend: { position: "right", labels: { boxWidth: 12, boxHeight: 12, usePointStyle: true } },
                    tooltip: {
                        ...commonTooltip,
                        callbacks: {
                            label: function(item) {
                                const val = item.raw;
                                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                                return ` ${item.label}: ${val} (${pct}%) • Click to inspect`;
                            }
                        }
                    },
                    centerText: langChartType === "doughnut" ? { total: String(total), label: "Languages" } : undefined
                },
                cutout: langChartType === "doughnut" ? "70%" : 0
            }
        });
    } else {
        charts.languages = new Chart(ctx, {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "Submissions",
                    data: counts,
                    backgroundColor: colors,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onHover: (e, el) => { e.native.target.style.cursor = el && el.length ? "pointer" : "default"; },
                onClick: clickHandler,
                plugins: {
                    legend: { display: false },
                    tooltip: commonTooltip
                },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "rgba(148, 163, 184, 0.08)" } },
                    x: { grid: { display: false } }
                }
            }
        });
    }
}

// ── 6. Contest Participation (Bar / Doughnut) ──
function renderContestsChart(contests) {
    destroyChart("contests");
    const ctx = document.getElementById("chartContests")?.getContext("2d");
    if (!ctx) return;

    let filtered = [...contests];
    if (activeSearchQuery) {
        filtered = filtered.filter(c => c.title.toLowerCase().includes(activeSearchQuery));
    }

    const labels = filtered.map(c => c.title.length > 22 ? c.title.slice(0, 20) + "…" : c.title);
    const counts = filtered.map(c => Number(c.participant_count) || 0);
    const total = counts.reduce((a, b) => a + b, 0);

    const clickHandler = (evt, elements) => {
        if (elements.length > 0) {
            const idx = elements[0].index;
            openDrilldownContest(filtered[idx]);
        }
    };

    if (contestChartType === "doughnut") {
        const colors = ["#f472b6", "#ec4899", "#db2777", "#be185d", "#9d174d"];
        charts.contests = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels,
                datasets: [{
                    data: counts,
                    backgroundColor: colors.slice(0, counts.length),
                    borderColor: "#1e293b",
                    borderWidth: 3,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onHover: (e, el) => { e.native.target.style.cursor = el && el.length ? "pointer" : "default"; },
                onClick: clickHandler,
                plugins: {
                    legend: { position: "right", labels: { boxWidth: 12, boxHeight: 12, usePointStyle: true } },
                    tooltip: commonTooltip,
                    centerText: { total: String(total), label: "Registrations" }
                },
                cutout: "68%"
            }
        });
    } else {
        const pinkGrad = createVerticalGradient(ctx, "#f472b6", "#db2777", 280);
        charts.contests = new Chart(ctx, {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "Registered Coders",
                    data: counts,
                    backgroundColor: pinkGrad,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onHover: (e, el) => { e.native.target.style.cursor = el && el.length ? "pointer" : "default"; },
                onClick: clickHandler,
                plugins: {
                    legend: { display: false },
                    tooltip: commonTooltip
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 },
                        grid: { color: "rgba(148, 163, 184, 0.08)" }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
    }
}

// ── 7. Rating Tier Distribution (Bar / Doughnut) ──
function renderRatingTiersChart(tiers) {
    destroyChart("ratingTiers");
    const ctx = document.getElementById("chartRatingTiers")?.getContext("2d");
    if (!ctx) return;

    const tierColors = {
        "Newbie (<1000)": "#94a3b8",
        "Pupil (1000-1399)": "#22c55e",
        "Specialist (1400-1799)": "#06b6d4",
        "Expert (1800+)": "#3b82f6"
    };

    const labels = tiers.map(t => t.tier);
    const counts = tiers.map(t => Number(t.count));
    const colors = labels.map(l => tierColors[l] || "#6366f1");
    const total = counts.reduce((a, b) => a + b, 0);

    const clickHandler = (evt, elements) => {
        if (elements.length > 0) {
            const idx = elements[0].index;
            openDrilldownTier(tiers[idx], total);
        }
    };

    if (ratingTierChartType === "doughnut") {
        charts.ratingTiers = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels,
                datasets: [{
                    data: counts,
                    backgroundColor: colors,
                    borderColor: "#1e293b",
                    borderWidth: 3,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onHover: (e, el) => { e.native.target.style.cursor = el && el.length ? "pointer" : "default"; },
                onClick: clickHandler,
                plugins: {
                    legend: { position: "right", labels: { boxWidth: 12, boxHeight: 12, usePointStyle: true } },
                    tooltip: commonTooltip,
                    centerText: { total: String(total), label: "Coders" }
                },
                cutout: "68%"
            }
        });
    } else {
        charts.ratingTiers = new Chart(ctx, {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "Users in Division",
                    data: counts,
                    backgroundColor: colors,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onHover: (e, el) => { e.native.target.style.cursor = el && el.length ? "pointer" : "default"; },
                onClick: clickHandler,
                plugins: {
                    legend: { display: false },
                    tooltip: commonTooltip
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 },
                        grid: { color: "rgba(148, 163, 184, 0.08)" }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
    }
}

// ── 8. Problem Bank Difficulty Balance (Bar / Doughnut) ──
function renderDifficultyChart(diffs) {
    destroyChart("difficulty");
    const ctx = document.getElementById("chartDifficulty")?.getContext("2d");
    if (!ctx) return;

    const diffColors = {
        "Easy": "#10b981",
        "Medium": "#f59e0b",
        "Hard": "#ef4444"
    };

    const labels = diffs.map(d => d.difficulty);
    const counts = diffs.map(d => Number(d.count));
    const colors = labels.map(l => diffColors[l] || "#6366f1");
    const total = counts.reduce((a, b) => a + b, 0);

    if (difficultyChartType === "doughnut") {
        charts.difficulty = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels,
                datasets: [{
                    data: counts,
                    backgroundColor: colors,
                    borderColor: "#1e293b",
                    borderWidth: 3,
                    hoverOffset: 12
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: "right", labels: { boxWidth: 14, boxHeight: 14, usePointStyle: true } },
                    tooltip: commonTooltip,
                    centerText: { total: String(total), label: "Catalog" }
                },
                cutout: "70%"
            }
        });
    } else {
        charts.difficulty = new Chart(ctx, {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "Problems in Catalog",
                    data: counts,
                    backgroundColor: colors,
                    borderRadius: 8,
                    barThickness: 54
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: commonTooltip
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 },
                        grid: { color: "rgba(148, 163, 184, 0.08)" }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
    }
}

// ── 9. Daily Submission Velocity & Activity Timeline (Area / Bar) ──
function renderDailySubmissionsChart(rawData) {
    destroyChart("dailySubmissions");
    const ctx = document.getElementById("chartDailySubmissions")?.getContext("2d");
    if (!ctx) return;

    if (!rawData.length) {
        rawData = [{ date: "Today", count: 0 }];
    }

    const labels = rawData.map(d => d.date);
    const counts = rawData.map(d => Number(d.count));

    if (dailySubsChartType === "line") {
        const gradient = createVerticalGradient(ctx, "rgba(168, 85, 247, 0.55)", "rgba(168, 85, 247, 0.0)", 290);
        charts.dailySubmissions = new Chart(ctx, {
            type: "line",
            data: {
                labels,
                datasets: [{
                    label: "Daily Submissions",
                    data: counts,
                    borderColor: "#c084fc",
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.36,
                    borderWidth: 3,
                    pointBackgroundColor: "#9333ea",
                    pointBorderColor: "#ffffff",
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onHover: (e, el) => { e.native.target.style.cursor = el && el.length ? "pointer" : "default"; },
                plugins: {
                    legend: { position: "top", labels: { boxWidth: 14, boxHeight: 14, usePointStyle: true } },
                    tooltip: commonTooltip
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 },
                        grid: { color: "rgba(148, 163, 184, 0.08)" }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
    } else {
        const barGradient = createVerticalGradient(ctx, "#c084fc", "#7e22ce", 280);
        charts.dailySubmissions = new Chart(ctx, {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "Daily Submissions",
                    data: counts,
                    backgroundColor: barGradient,
                    borderRadius: 8,
                    barThickness: 28
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onHover: (e, el) => { e.native.target.style.cursor = el && el.length ? "pointer" : "default"; },
                plugins: {
                    legend: { display: false },
                    tooltip: commonTooltip
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 },
                        grid: { color: "rgba(148, 163, 184, 0.08)" }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
    }
}

// ==========================================
// DRILL-DOWN INSPECTOR MODAL IMPLEMENTATION
// ==========================================
function openDrilldownProblem(prob) {
    if (!prob) return;
    document.getElementById("drillIcon").textContent = "⚡";
    document.getElementById("drillTitle").textContent = prob.title;
    document.getElementById("drillSubtitle").textContent = `Problem #${prob.problem_id || prob.id} • ${prob.difficulty} Tier`;

    const subs = Number(prob.total_submissions) || 0;
    const solves = Number(prob.solve_count) || 0;
    const accRate = subs > 0 ? ((solves / subs) * 100).toFixed(1) : "0.0";
    const avgAtt = prob.avg_attempts ? Number(prob.avg_attempts).toFixed(1) : "N/A";
    const diffColor = prob.difficulty === "Easy" ? "#10b981" : prob.difficulty === "Medium" ? "#f59e0b" : "#ef4444";

    document.getElementById("drillBody").innerHTML = `
        <div class="drill-stat-grid">
            <div class="drill-stat-box">
                <span class="drill-stat-label">Difficulty</span>
                <span class="drill-stat-val" style="color: ${diffColor};">${prob.difficulty}</span>
            </div>
            <div class="drill-stat-box">
                <span class="drill-stat-label">Unique Solvers</span>
                <span class="drill-stat-val" style="color: #34d399;">${solves} coders</span>
            </div>
            <div class="drill-stat-box">
                <span class="drill-stat-label">Total Submissions</span>
                <span class="drill-stat-val" style="color: #818cf8;">${subs}</span>
            </div>
            <div class="drill-stat-box">
                <span class="drill-stat-label">Avg. Attempts / Solver</span>
                <span class="drill-stat-val" style="color: #fbbf24;">${avgAtt}</span>
            </div>
        </div>
        <div class="drill-stat-box">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="drill-stat-label">Acceptance Rate</span>
                <span style="font-weight: 800; font-size: 0.95rem; color: #34d399;">${accRate}%</span>
            </div>
            <div class="drill-progress-bar-wrap">
                <div class="drill-progress-bar-fill" style="width: ${accRate}%;"></div>
            </div>
        </div>
        <div class="drill-quick-actions">
            <a href="/problems/${prob.problem_id || prob.id}" target="_blank" class="drill-action-btn drill-action-primary">View Problem Page ↗</a>
            <a href="/admin/problems" class="drill-action-btn drill-action-secondary">Manage Problem Bank →</a>
        </div>
    `;
    openModal("drilldownModal");
}

function openDrilldownVerdict(v, totalSubs) {
    if (!v) return;
    const count = Number(v.count);
    const pct = totalSubs > 0 ? ((count / totalSubs) * 100).toFixed(1) : 0;
    document.getElementById("drillIcon").textContent = "🍩";
    document.getElementById("drillTitle").textContent = `${v.verdict} Outcome`;
    document.getElementById("drillSubtitle").textContent = "Submission Evaluation Telemetry";
    document.getElementById("drillBody").innerHTML = `
        <div class="drill-stat-grid">
            <div class="drill-stat-box">
                <span class="drill-stat-label">Verdict Outcome</span>
                <span class="drill-stat-val">${v.verdict}</span>
            </div>
            <div class="drill-stat-box">
                <span class="drill-stat-label">Total Submissions</span>
                <span class="drill-stat-val" style="color: #818cf8;">${count}</span>
            </div>
            <div class="drill-stat-box">
                <span class="drill-stat-label">Platform Share</span>
                <span class="drill-stat-val" style="color: #38bdf8;">${pct}%</span>
            </div>
            <div class="drill-stat-box">
                <span class="drill-stat-label">Total Volume Examined</span>
                <span class="drill-stat-val">${totalSubs}</span>
            </div>
        </div>
        <div class="drill-quick-actions">
            <a href="/admin/submissions" class="drill-action-btn drill-action-primary">View Submissions Audit Log →</a>
        </div>
    `;
    openModal("drilldownModal");
}

function openDrilldownLanguage(lang, totalSubs) {
    if (!lang) return;
    const count = Number(lang.count);
    const pct = totalSubs > 0 ? ((count / totalSubs) * 100).toFixed(1) : 0;
    document.getElementById("drillIcon").textContent = "💻";
    document.getElementById("drillTitle").textContent = `${lang.language} Programming Language`;
    document.getElementById("drillSubtitle").textContent = "Compiler & Runtime Distribution";
    document.getElementById("drillBody").innerHTML = `
        <div class="drill-stat-grid">
            <div class="drill-stat-box">
                <span class="drill-stat-label">Language Identifier</span>
                <span class="drill-stat-val">${lang.language}</span>
            </div>
            <div class="drill-stat-box">
                <span class="drill-stat-label">Submissions Made</span>
                <span class="drill-stat-val" style="color: #38bdf8;">${count}</span>
            </div>
            <div class="drill-stat-box">
                <span class="drill-stat-label">Market Share</span>
                <span class="drill-stat-val" style="color: #34d399;">${pct}%</span>
            </div>
            <div class="drill-stat-box">
                <span class="drill-stat-label">Total Submissions Evaluated</span>
                <span class="drill-stat-val">${totalSubs}</span>
            </div>
        </div>
        <div class="drill-quick-actions">
            <a href="/admin/submissions" class="drill-action-btn drill-action-primary">Inspect Code Submissions →</a>
        </div>
    `;
    openModal("drilldownModal");
}

function openDrilldownContest(c) {
    if (!c) return;
    document.getElementById("drillIcon").textContent = "🥊";
    document.getElementById("drillTitle").textContent = c.title;
    document.getElementById("drillSubtitle").textContent = `Contest #${c.contest_id || c.id} Telemetry`;
    document.getElementById("drillBody").innerHTML = `
        <div class="drill-stat-grid">
            <div class="drill-stat-box">
                <span class="drill-stat-label">Registered Coders</span>
                <span class="drill-stat-val" style="color: #f472b6;">${c.participant_count}</span>
            </div>
            <div class="drill-stat-box">
                <span class="drill-stat-label">Status</span>
                <span class="drill-stat-val" style="color: #34d399;">Active Competition</span>
            </div>
        </div>
        <div class="drill-quick-actions">
            <a href="/contests/${c.contest_id || c.id}" target="_blank" class="drill-action-btn drill-action-primary">View Contest Page ↗</a>
            <a href="/admin/contests" class="drill-action-btn drill-action-secondary">Manage Contests →</a>
        </div>
    `;
    openModal("drilldownModal");
}

function openDrilldownTier(tier, total) {
    if (!tier) return;
    const count = Number(tier.count);
    const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
    document.getElementById("drillIcon").textContent = "🌟";
    document.getElementById("drillTitle").textContent = `${tier.tier} Tier`;
    document.getElementById("drillSubtitle").textContent = "Community Skill Division";
    document.getElementById("drillBody").innerHTML = `
        <div class="drill-stat-grid">
            <div class="drill-stat-box">
                <span class="drill-stat-label">Division Name</span>
                <span class="drill-stat-val">${tier.tier}</span>
            </div>
            <div class="drill-stat-box">
                <span class="drill-stat-label">Coders in Tier</span>
                <span class="drill-stat-val" style="color: #38bdf8;">${count}</span>
            </div>
            <div class="drill-stat-box">
                <span class="drill-stat-label">Community Share</span>
                <span class="drill-stat-val" style="color: #a5b4fc;">${pct}%</span>
            </div>
            <div class="drill-stat-box">
                <span class="drill-stat-label">Active Rated Population</span>
                <span class="drill-stat-val">${total}</span>
            </div>
        </div>
        <div class="drill-quick-actions">
            <a href="/admin/users" class="drill-action-btn drill-action-primary">Manage Users Directory →</a>
        </div>
    `;
    openModal("drilldownModal");
}

// Close drill-down modal events
document.getElementById("closeDrillBtn")?.addEventListener("click", () => closeModal("drilldownModal"));
document.getElementById("drillCloseFooterBtn")?.addEventListener("click", () => closeModal("drilldownModal"));
document.getElementById("drilldownModal")?.addEventListener("click", (e) => {
    if (e.target.id === "drilldownModal") closeModal("drilldownModal");
});

// ==========================================
// HD CHART FOCUS VIEW MODAL
// ==========================================
let currentFocusKey = null;

function openFocusView(key) {
    currentFocusKey = key;
    const modal = document.getElementById("focusModal");
    const canvas = document.getElementById("chartFocusCanvas");
    const container = document.getElementById("focusTableContainer");
    const titleEl = document.getElementById("focusTitle");
    const subtitleEl = document.getElementById("focusSubtitle");
    const recordsCountEl = document.getElementById("focusRecordsCount");

    if (focusChartInstance) {
        focusChartInstance.destroy();
        focusChartInstance = null;
    }

    const titles = {
        userGrowth: { title: "User Registrations & Growth Trajectory", sub: "Chronological coder registrations & cumulative community curve" },
        problemSolves: { title: "Solves per Problem Breakdown", sub: "Complete leaderboard of solved problems & accepted coders" },
        problemAttempts: { title: "Submissions vs Solvers Telemetry", sub: "Platform effort ratio, total attempts and solvers per problem" },
        verdicts: { title: "Submission Verdict Outcomes", sub: "Full distribution of evaluation results across all user code runs" },
        languages: { title: "Programming Language Adoption", sub: "Languages selected by coders across all submissions" },
        contests: { title: "Contest Participation & Turnout", sub: "Coder registrations across all programming competitions" },
        ratingTiers: { title: "Community Rating Skill Tiers", sub: "Distribution of rated coders across competitive divisions" },
        difficulty: { title: "Problem Bank Difficulty Distribution", sub: "Balance of Easy, Medium, and Hard challenges in platform catalog" },
        dailySubmissions: { title: "Daily Submissions Velocity & Volume", sub: "Daily submission frequency timeline and platform code runs" }
    };

    titleEl.textContent = titles[key]?.title || "Chart Focus View";
    subtitleEl.textContent = titles[key]?.sub || "High-resolution telemetry";

    const data = getChartDataset(key);
    recordsCountEl.textContent = `${data.rows.length} records`;

    // Render Table
    let tableHtml = `<table class="focus-table"><thead><tr>`;
    data.headers.forEach(h => { tableHtml += `<th>${h}</th>`; });
    tableHtml += `</tr></thead><tbody>`;
    data.rows.forEach(r => {
        tableHtml += `<tr>`;
        r.forEach(c => { tableHtml += `<td>${c}</td>`; });
        tableHtml += `</tr>`;
    });
    tableHtml += `</tbody></table>`;
    container.innerHTML = tableHtml;

    // Render High-res Chart in Focus Canvas
    const ctx = canvas.getContext("2d");
    renderFocusChart(key, ctx);

    openModal("focusModal");
}

function renderFocusChart(key, ctx) {
    if (!cachedAnalyticsData) return;

    if (key === "userGrowth") {
        const raw = cachedAnalyticsData.registrationsOverTime || [];
        let running = 0;
        const labels = raw.map(d => d.date);
        const daily = raw.map(d => Number(d.count));
        const cumulative = daily.map(c => (running += c));
        const grad = createVerticalGradient(ctx, "rgba(99, 102, 241, 0.55)", "rgba(99, 102, 241, 0.0)", 360);
        focusChartInstance = new Chart(ctx, {
            type: "line",
            data: {
                labels,
                datasets: [
                    { type: "line", label: "Cumulative Coders", data: cumulative, borderColor: "#818cf8", backgroundColor: grad, fill: true, tension: 0.35, borderWidth: 3, pointRadius: 6 },
                    { type: "bar", label: "New Daily Registrations", data: daily, backgroundColor: "#38bdf8", borderRadius: 8, barThickness: 32 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top" }, tooltip: commonTooltip } }
        });
    } else if (key === "problemSolves") {
        const probs = cachedAnalyticsData.problemSolveStats || [];
        focusChartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: probs.map(p => p.title),
                datasets: [{ label: "Unique Solvers", data: probs.map(p => Number(p.solve_count)), backgroundColor: "#34d399", borderRadius: 8 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: commonTooltip } }
        });
    } else if (key === "problemAttempts") {
        const probs = cachedAnalyticsData.problemSolveStats || [];
        focusChartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: probs.map(p => p.title),
                datasets: [
                    { label: "Total Submissions", data: probs.map(p => Number(p.total_submissions)), backgroundColor: "#818cf8", borderRadius: 6 },
                    { label: "Accepted Solvers", data: probs.map(p => Number(p.solve_count)), backgroundColor: "#34d399", borderRadius: 6 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top" }, tooltip: commonTooltip } }
        });
    } else if (key === "verdicts") {
        const verdicts = cachedAnalyticsData.verdictDistribution || [];
        focusChartInstance = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: verdicts.map(v => v.verdict),
                datasets: [{ data: verdicts.map(v => Number(v.count)), backgroundColor: ["#10b981", "#ef4444", "#f59e0b", "#ec4899", "#a855f7", "#f97316", "#3b82f6"] }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right" }, tooltip: commonTooltip }, cutout: "65%" }
        });
    } else if (key === "languages") {
        const langs = cachedAnalyticsData.languageDistribution || [];
        focusChartInstance = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: langs.map(l => l.language),
                datasets: [{ data: langs.map(l => Number(l.count)), backgroundColor: ["#0284c7", "#eab308", "#f97316", "#22c55e", "#64748b"] }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right" }, tooltip: commonTooltip }, cutout: "65%" }
        });
    } else if (key === "contests") {
        const contests = cachedAnalyticsData.contestParticipation || [];
        focusChartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: contests.map(c => c.title),
                datasets: [{ label: "Registered Coders", data: contests.map(c => Number(c.participant_count)), backgroundColor: "#f472b6", borderRadius: 8 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: commonTooltip } }
        });
    } else if (key === "ratingTiers") {
        const tiers = cachedAnalyticsData.ratingDistribution || [];
        focusChartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: tiers.map(t => t.tier),
                datasets: [{ label: "Users in Division", data: tiers.map(t => Number(t.count)), backgroundColor: ["#94a3b8", "#22c55e", "#06b6d4", "#3b82f6"], borderRadius: 8 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: commonTooltip } }
        });
    } else if (key === "difficulty") {
        const diffs = cachedAnalyticsData.difficultyDistribution || [];
        focusChartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: diffs.map(d => d.difficulty),
                datasets: [{ label: "Catalog Problems", data: diffs.map(d => Number(d.count)), backgroundColor: ["#10b981", "#f59e0b", "#ef4444"], borderRadius: 8 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: commonTooltip } }
        });
    } else if (key === "dailySubmissions") {
        const raw = cachedAnalyticsData.dailySubmissions || [];
        const labels = raw.map(d => d.date);
        const counts = raw.map(d => Number(d.count));
        const grad = createVerticalGradient(ctx, "rgba(168, 85, 247, 0.55)", "rgba(168, 85, 247, 0.0)", 360);
        focusChartInstance = new Chart(ctx, {
            type: "line",
            data: {
                labels,
                datasets: [{
                    label: "Daily Submissions",
                    data: counts,
                    borderColor: "#c084fc",
                    backgroundColor: grad,
                    fill: true,
                    tension: 0.35,
                    borderWidth: 3,
                    pointRadius: 6
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top" }, tooltip: commonTooltip } }
        });
    }
}

function getChartDataset(key) {
    if (!cachedAnalyticsData) return { headers: [], rows: [] };

    if (key === "userGrowth") {
        const raw = cachedAnalyticsData.registrationsOverTime || [];
        let running = 0;
        return {
            headers: ["Date", "New Registrations", "Cumulative Users"],
            rows: raw.map(d => {
                const c = Number(d.count);
                running += c;
                return [d.date, c, running];
            })
        };
    } else if (key === "problemSolves") {
        const probs = cachedAnalyticsData.problemSolveStats || [];
        return {
            headers: ["Problem ID", "Title", "Difficulty", "Unique Solvers", "Total Submissions", "Solve Rate %"],
            rows: probs.map(p => {
                const subs = Number(p.total_submissions) || 0;
                const solves = Number(p.solve_count) || 0;
                const rate = subs > 0 ? ((solves / subs) * 100).toFixed(1) + "%" : "0.0%";
                return [p.problem_id || p.id, p.title, p.difficulty, solves, subs, rate];
            })
        };
    } else if (key === "problemAttempts") {
        const probs = cachedAnalyticsData.problemSolveStats || [];
        return {
            headers: ["Problem ID", "Title", "Difficulty", "Total Submissions", "Unique Solvers", "Avg Attempts / Solver"],
            rows: probs.map(p => [p.problem_id || p.id, p.title, p.difficulty, p.total_submissions, p.solve_count, p.avg_attempts || "N/A"])
        };
    } else if (key === "verdicts") {
        const verdicts = cachedAnalyticsData.verdictDistribution || [];
        const total = verdicts.reduce((acc, v) => acc + Number(v.count), 0);
        return {
            headers: ["Verdict", "Submissions Count", "Platform Share %"],
            rows: verdicts.map(v => {
                const c = Number(v.count);
                const pct = total > 0 ? ((c / total) * 100).toFixed(1) + "%" : "0.0%";
                return [v.verdict, c, pct];
            })
        };
    } else if (key === "languages") {
        const langs = cachedAnalyticsData.languageDistribution || [];
        const total = langs.reduce((acc, l) => acc + Number(l.count), 0);
        return {
            headers: ["Programming Language", "Submissions Count", "Platform Share %"],
            rows: langs.map(l => {
                const c = Number(l.count);
                const pct = total > 0 ? ((c / total) * 100).toFixed(1) + "%" : "0.0%";
                return [l.language, c, pct];
            })
        };
    } else if (key === "contests") {
        const contests = cachedAnalyticsData.contestParticipation || [];
        return {
            headers: ["Contest ID", "Contest Title", "Registered Coders"],
            rows: contests.map(c => [c.contest_id || c.id, c.title, c.participant_count])
        };
    } else if (key === "ratingTiers") {
        const tiers = cachedAnalyticsData.ratingDistribution || [];
        const total = tiers.reduce((acc, t) => acc + Number(t.count), 0);
        return {
            headers: ["Rating Tier Division", "Coders Count", "Community Share %"],
            rows: tiers.map(t => {
                const c = Number(t.count);
                const pct = total > 0 ? ((c / total) * 100).toFixed(1) + "%" : "0.0%";
                return [t.tier, c, pct];
            })
        };
    } else if (key === "difficulty") {
        const diffs = cachedAnalyticsData.difficultyDistribution || [];
        const total = diffs.reduce((acc, d) => acc + Number(d.count), 0);
        return {
            headers: ["Difficulty Level", "Catalog Problems Count", "Share %"],
            rows: diffs.map(d => {
                const c = Number(d.count);
                const pct = total > 0 ? ((c / total) * 100).toFixed(1) + "%" : "0.0%";
                return [d.difficulty, c, pct];
            })
        };
    } else if (key === "dailySubmissions") {
        const raw = cachedAnalyticsData.dailySubmissions || [];
        let running = 0;
        return {
            headers: ["Date", "Submissions Count", "Cumulative Submissions"],
            rows: raw.map(d => {
                const c = Number(d.count);
                running += c;
                return [d.date, c, running];
            })
        };
    }
    return { headers: [], rows: [] };
}

// Close Focus Modal
document.getElementById("closeFocusBtn")?.addEventListener("click", () => closeModal("focusModal"));
document.getElementById("focusModal")?.addEventListener("click", (e) => {
    if (e.target.id === "focusModal") closeModal("focusModal");
});

// Focus Modal PNG and CSV Buttons
document.getElementById("focusPngBtn")?.addEventListener("click", () => {
    const canvas = document.getElementById("chartFocusCanvas");
    if (!canvas) return;
    const uri = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = uri;
    a.download = `codebd-focus-${currentFocusKey || "chart"}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

document.getElementById("focusCsvBtn")?.addEventListener("click", () => {
    if (!currentFocusKey) return;
    const data = getChartDataset(currentFocusKey);
    downloadCsv(`codebd-${currentFocusKey}.csv`, [data.headers, ...data.rows]);
});

// ==========================================
// CSV EXPORT SUITE
// ==========================================
function downloadCsv(filename, rows) {
    const processRow = row => row.map(val => {
        let str = (val === null || val === undefined) ? "" : String(val);
        if (str.search(/("|,|\n)/g) >= 0) str = '"' + str.replace(/"/g, '""') + '"';
        return str;
    }).join(",");

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rows.map(processRow).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Export individual chart CSV
document.querySelectorAll("[data-export-csv]").forEach(btn => {
    btn.addEventListener("click", () => {
        const key = btn.dataset.exportCsv;
        const data = getChartDataset(key);
        if (data.headers.length) {
            downloadCsv(`codebd-${key}.csv`, [data.headers, ...data.rows]);
        }
    });
});

// Export all analytics CSV
document.getElementById("exportAllCsvBtn")?.addEventListener("click", () => {
    if (!cachedAnalyticsData) return;
    const keys = ["userGrowth", "dailySubmissions", "problemSolves", "problemAttempts", "verdicts", "languages", "contests", "ratingTiers", "difficulty"];
    const allRows = [];
    allRows.push(["CODEBD PLATFORM ANALYTICS COMPREHENSIVE REPORT"]);
    allRows.push([`Generated on: ${new Date().toISOString()}`]);
    allRows.push([]);

    keys.forEach(k => {
        const d = getChartDataset(k);
        allRows.push([`--- ${k.toUpperCase()} ---`]);
        allRows.push(d.headers);
        d.rows.forEach(r => allRows.push(r));
        allRows.push([]);
    });

    downloadCsv(`codebd-platform-analytics-full-${new Date().toISOString().slice(0, 10)}.csv`, allRows);
});

// Focus Button handlers
document.querySelectorAll(".btn-focus").forEach(btn => {
    btn.addEventListener("click", () => {
        const key = btn.dataset.focus;
        if (key) openFocusView(key);
    });
});

// ==========================================
// REAL-TIME SEARCH & FILTER
// ==========================================
const searchInput = document.getElementById("analyticsSearchInput");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const activeFilterNotice = document.getElementById("activeFilterNotice");
const filterTermDisplay = document.getElementById("filterTermDisplay");
const resetFilterNoticeBtn = document.getElementById("resetFilterNoticeBtn");

function applySearchFilter(term) {
    activeSearchQuery = term.trim().toLowerCase();
    if (activeSearchQuery) {
        clearSearchBtn.style.display = "block";
        activeFilterNotice.style.display = "flex";
        filterTermDisplay.textContent = `"${term}"`;
    } else {
        clearSearchBtn.style.display = "none";
        activeFilterNotice.style.display = "none";
    }

    if (cachedAnalyticsData) {
        renderProblemSolvesChart(cachedAnalyticsData.problemSolveStats || []);
        renderAttemptsChart(cachedAnalyticsData.problemSolveStats || []);
        renderContestsChart(cachedAnalyticsData.contestParticipation || []);
    }
}

if (searchInput) {
    searchInput.addEventListener("input", (e) => applySearchFilter(e.target.value));
}

function clearSearch() {
    if (searchInput) searchInput.value = "";
    applySearchFilter("");
}

clearSearchBtn?.addEventListener("click", clearSearch);
resetFilterNoticeBtn?.addEventListener("click", clearSearch);

// Keyboard escape to close modals
window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeModal("drilldownModal");
        closeModal("focusModal");
    }
});

// ==========================================
// INTERACTIVE EVENT LISTENERS (VIEW TOGGLES)
// ==========================================

// 1. Growth Mode
document.querySelectorAll("#growthPillGroup .pill-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll("#growthPillGroup .pill-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        growthMode = btn.dataset.mode;
        if (cachedAnalyticsData) renderUserGrowthChart(cachedAnalyticsData.registrationsOverTime || []);
    });
});

// 2. Solves Difficulty Filter
document.querySelectorAll("#solvesFilterGroup .pill-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll("#solvesFilterGroup .pill-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        solvesDiffFilter = btn.dataset.diff;
        if (cachedAnalyticsData) renderProblemSolvesChart(cachedAnalyticsData.problemSolveStats || []);
    });
});

// 2b. Solves Sort Mode
document.querySelectorAll("#solvesSortGroup .pill-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll("#solvesSortGroup .pill-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        solvesSortMode = btn.dataset.sort;
        if (cachedAnalyticsData) renderProblemSolvesChart(cachedAnalyticsData.problemSolveStats || []);
    });
});

// 3. Attempts View Mode (Grouped / Stacked)
document.querySelectorAll("#attemptsViewModeGroup .pill-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll("#attemptsViewModeGroup .pill-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        attemptsViewMode = btn.dataset.mode;
        if (cachedAnalyticsData) renderAttemptsChart(cachedAnalyticsData.problemSolveStats || []);
    });
});

// 4. Verdict Type Toggle
document.querySelectorAll("#verdictTypeGroup .pill-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll("#verdictTypeGroup .pill-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        verdictChartType = btn.dataset.type;
        if (cachedAnalyticsData) renderVerdictsChart(cachedAnalyticsData.verdictDistribution || []);
    });
});

// 5. Language Type Toggle
document.querySelectorAll("#langTypeGroup .pill-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll("#langTypeGroup .pill-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        langChartType = btn.dataset.type;
        if (cachedAnalyticsData) renderLanguagesChart(cachedAnalyticsData.languageDistribution || []);
    });
});

// 6. Contest View Mode Toggle
document.querySelectorAll("#contestViewModeGroup .pill-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll("#contestViewModeGroup .pill-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        contestChartType = btn.dataset.type;
        if (cachedAnalyticsData) renderContestsChart(cachedAnalyticsData.contestParticipation || []);
    });
});

// 7. Rating Tier View Mode Toggle
document.querySelectorAll("#ratingTierViewModeGroup .pill-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll("#ratingTierViewModeGroup .pill-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        ratingTierChartType = btn.dataset.type;
        if (cachedAnalyticsData) renderRatingTiersChart(cachedAnalyticsData.ratingDistribution || []);
    });
});

// 8. Difficulty View Mode Toggle
document.querySelectorAll("#difficultyViewModeGroup .pill-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll("#difficultyViewModeGroup .pill-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        difficultyChartType = btn.dataset.type;
        if (cachedAnalyticsData) renderDifficultyChart(cachedAnalyticsData.difficultyDistribution || []);
    });
});

// 9. Daily Submissions View Mode Toggle
document.querySelectorAll("#dailySubsViewModeGroup .pill-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll("#dailySubsViewModeGroup .pill-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        dailySubsChartType = btn.dataset.type;
        if (cachedAnalyticsData) renderDailySubmissionsChart(cachedAnalyticsData.dailySubmissions || []);
    });
});

// Chart Snapshot Exporter (Download PNG)
document.querySelectorAll("[data-export]").forEach(btn => {
    btn.addEventListener("click", () => {
        const canvasId = btn.dataset.export;
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const imageUri = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = imageUri;
        a.download = `codebd-${canvasId.toLowerCase()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
});

// Refresh button
const refreshBtn = document.getElementById("refreshChartsBtn");
if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
        refreshBtn.disabled = true;
        refreshBtn.textContent = "Updating...";
        await Promise.all([loadStats(), loadAnalytics()]);
        refreshBtn.disabled = false;
        refreshBtn.textContent = "↻ Refresh";
    });
}

// Initial Boot
loadStats();
loadAnalytics();

