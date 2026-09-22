const express = require("express");
const router = express.Router();

const submissionController = require("../controllers/submissionsController");
const authenticate = require("../middlewares/authMiddleware");


// Get user's own submissions
router.get("/", authenticate, submissionController.getUserSubmissions);

// Create a new submission
router.post("/", authenticate, submissionController.createSubmission);


module.exports = router;
