require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static("public"));

const authRoutes       = require("./routes/authRoutes");
const userRoutes       = require("./routes/userRoutes");
const problemRoutes    = require("./routes/problemRoutes");
const bookmarksRoutes  = require("./routes/bookmarksRoutes");
const submissionRoutes = require("./routes/submissionsRoutes");
const adminRoutes      = require("./routes/adminRoutes");

app.use("/api/auth",        authRoutes);
app.use("/api/user",        userRoutes);
app.use("/api/problems",    problemRoutes);
app.use("/api/bookmarks",   bookmarksRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/admin",       adminRoutes);




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


app.get("/auth/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/auth/register", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "register.html"));
});




app.get("/user/profile", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "profile.html"));
});


app.get("/", (req, res) => {
    res.redirect("/home");
});

app.get("/home", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "home.html"));
});

app.get("/contest", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "contest.html"));
});

app.get("/problems", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "problem.html"));
});

app.get("/submissions", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "submissions.html"));
});



const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`CodeBD running on port ${PORT}`);
});