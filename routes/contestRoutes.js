const express = require("express");
const router = express.Router();

const contestController = require("../controllers/contestController");
const authenticate = require("../middlewares/authMiddleware");


// Public — list all contests
router.get("/", contestController.getContests);

// Public — get single contest with problems
router.get("/:id", contestController.getContestById);

// Authenticated — register for contest
router.post("/:id/register", authenticate, contestController.registerForContest);

// Public — get contest ranking
router.get("/:id/ranking", contestController.getContestRanking);


module.exports = router;
