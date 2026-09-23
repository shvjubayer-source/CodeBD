const express = require("express");
const router = express.Router();

const contestController = require("../controllers/contestController");
const authenticate = require("../middlewares/authMiddleware");


// Authenticated — list all contests
router.get("/", authenticate, contestController.getContests);

// Authenticated — get single contest with problems
router.get("/:id", authenticate, contestController.getContestById);

// Authenticated — register for contest
router.post("/:id/register", authenticate, contestController.registerForContest);

// Authenticated — get contest ranking
router.get("/:id/ranking", authenticate, contestController.getContestRanking);


module.exports = router;
