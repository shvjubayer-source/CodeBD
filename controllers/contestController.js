const jwt = require("jsonwebtoken");
const contestModel = require("../models/contestModel");

async function getContests(req, res) {
    try {
        const userId = req.user ? req.user.userId : null;
        const contests = await contestModel.getAllContests(userId);
        return res.status(200).json(contests);
    } catch (error) {
        console.error("getContests error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

async function getContestById(req, res) {
    try {
        const contestId = req.params.id;
        const contest = await contestModel.getContestById(contestId);

        if (!contest) {
            return res.status(404).json({ message: "Contest not found" });
        }

        const problems = await contestModel.getContestProblems(contestId);
        return res.status(200).json({ ...contest, problems });
    } catch (error) {
        console.error("getContestById error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

async function registerForContest(req, res) {
    try {
        const userId = req.user.userId;
        const contestId = req.params.id;

        const participation = await contestModel.registerParticipant(userId, contestId);

        if (!participation) {
            return res.status(200).json({ message: "Already registered for this contest" });
        }

        return res.status(201).json({
            message: "Successfully registered for contest",
            participation
        });
    } catch (error) {
        console.error("registerForContest error:", error);

        if (error.code === "23503") {
            return res.status(404).json({ message: "Contest not found" });
        }

        // Custom validation error from database trigger or procedure (P0001)
        if (error.code === "P0001" || (error.message && error.message.includes("already ended"))) {
            return res.status(400).json({ message: error.message || "Cannot register: contest has already ended" });
        }

        return res.status(500).json({ message: "Internal Server Error" });
    }
}

async function getContestRanking(req, res) {
    try {
        const contestId = req.params.id;
        const ranking = await contestModel.getContestRanking(contestId);
        return res.status(200).json(ranking);
    } catch (error) {
        console.error("getContestRanking error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

module.exports = {
    getContests,
    getContestById,
    registerForContest,
    getContestRanking
};
