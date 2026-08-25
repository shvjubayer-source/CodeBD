const express=require("express");
const path = require("path");

const router=express.Router();

const submissionController=require("../controllers/submissionsController")

const authenticate=require("../middlewares/authMiddleware");
const { route } = require("./authRoutes");


router.get("/", authenticate, submissionController.getUserSubmissions);

module.exports=router;
