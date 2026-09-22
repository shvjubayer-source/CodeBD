require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static("public"));

// ── API Routes ────────────────────────────────────────────────────────────────
const authRoutes        = require("./routes/authRoutes");
const userRoutes        = require("./routes/userRoutes");
const problemRoutes     = require("./routes/problemRoutes");
const bookmarksRoutes   = require("./routes/bookmarksRoutes");
const submissionRoutes  = require("./routes/submissionsRoutes");
const adminRoutes       = require("./routes/adminRoutes");
const contestRoutes     = require("./routes/contestRoutes");

app.use("/api/auth",        authRoutes);
app.use("/api/user",        userRoutes);
app.use("/api/problems",    problemRoutes);
app.use("/api/bookmarks",   bookmarksRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/admin",       adminRoutes);
app.use("/api/contests",    contestRoutes);


// ── Admin Pages ───────────────────────────────────────────────────────────────
app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("/admin/problems", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "adminproblem.html"));
});

app.get("/admin/contests", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "adminContests.html"));
});

app.get("/admin/users", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "adminUsers.html"));
});

app.get("/admin/submissions", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "adminSubmissions.html"));
});

app.get("/admin/tags", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "adminTags.html"));
});


// ── Auth Pages ────────────────────────────────────────────────────────────────
app.get("/auth/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/login", (req, res) => {
    res.redirect("/auth/login");
});

app.get("/auth/register", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "register.html"));
});

app.get("/register", (req, res) => {
    res.redirect("/auth/register");
});


// ── User Pages ────────────────────────────────────────────────────────────────
app.get("/user/profile", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "profile.html"));
});

app.get("/profile", (req, res) => {
    res.redirect("/user/profile");
});

app.get("/user/bookmarks", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "bookmarks.html"));
});

app.get("/bookmarks", (req, res) => {
    res.redirect("/user/bookmarks");
});

app.get("/user/submissions", (req, res) => {
    res.redirect("/submissions");
});

app.get("/user/contests", (req, res) => {
    res.redirect("/contest");
});


// ── Main Pages ────────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
    res.redirect("/home");
});

app.get("/home", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "home.html"));
});

app.get("/contest", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "contest.html"));
});

app.get("/contests", (req, res) => {
    res.redirect("/contest");
});

app.get("/problems", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "problem.html"));
});

// Single problem detail page
app.get("/problems/:id", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "problemDetail.html"));
});

app.get("/submissions", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "submissions.html"));
});


// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log(`CodeBD running on http://localhost:${PORT}`);
});

server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        console.error(`\n❌ Error: Port ${PORT} is already in use by another process.`);
        console.error(`👉 Solutions:`);
        console.error(`   1. Free port ${PORT} by stopping the existing server process`);
        console.error(`   2. Or set a different PORT in .env (e.g. PORT=3001)\n`);
        process.exit(1);
    } else {
        console.error("Server error:", err);
        process.exit(1);
    }
});