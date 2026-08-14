require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static("public"));

// Routes
const authRoutes = require("./routes/authRoutes");
const userRoutes=require("./routes/userRoutes");
const problemRoutes=require("./routes/problemRoutes");


app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/problems", problemRoutes);

//for frontend

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

    res.sendFile(path.join(__dirname, "public", "profile.html"));
});

app.get("/home", (req, res)=>{
    res.sendFile(path.join(__dirname, "public", "home.html"));
});

app.get("/contest", (req, res)=>{
    res.sendFile(path.join(__dirname, "public", "contest.html"));
});

app.get("/problem", (req, res)=>{
    res.sendFile(path.join(__dirname, "public", "problem.html"));
});







const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`CodeBD running on port ${PORT}`);
});