const submissionsModel = require("../models/submissionsModel");

async function getUserSubmissions(req, res) {
    try {
        const userSubmissions = await submissionsModel.getUserSubmissions(req.user.userId);
        res.json(userSubmissions);
    } catch (error) {
        console.error("Error fetching submissions:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

async function createSubmission(req, res) {
    try {
        const userId = req.user.userId;
        const { problem_id, language, code } = req.body;

        if (!problem_id || !language || !code) {
            return res.status(400).json({
                message: "problem_id, language, and code are required"
            });
        }

        const submission = await submissionsModel.createSubmission(
            userId,
            problem_id,
            language,
            code
        );

        return res.status(201).json({
            message: "Submission received",
            submission
        });
    } catch (error) {
        console.error("Error creating submission:", error);

        // Foreign key violation — problem doesn't exist
        if (error.code === "23503") {
            return res.status(404).json({ message: "Problem not found" });
        }

        return res.status(500).json({ message: "Internal Server Error" });
    }
}

module.exports = {
    getUserSubmissions,
    createSubmission
};