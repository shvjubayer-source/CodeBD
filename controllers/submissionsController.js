const submissionsModel = require("../models/submissionsModel");
const judgeService = require("../services/judgeService");

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

        // 1. Initial submission record (Pending)
        const initialSubmission = await submissionsModel.createSubmission(
            userId,
            problem_id,
            language,
            code
        );

        // 2. Fetch testcases & problem constraints
        const [testcases, constraints] = await Promise.all([
            submissionsModel.getProblemTestCases(problem_id),
            submissionsModel.getProblemConstraints(problem_id)
        ]);

        const timeLimit = constraints ? Number(constraints.time_limit) : 2;

        // 3. Automated code evaluation
        const evalResult = await judgeService.evaluateSubmission(
            language,
            code,
            testcases,
            timeLimit
        );

        // 4. Update submission record with verdict and execution time
        const updatedSubmission = await submissionsModel.updateSubmissionResult(
            initialSubmission.submission_id,
            evalResult.verdict,
            evalResult.executionTime
        );

        return res.status(201).json({
            message: `Submission evaluated: ${evalResult.verdict}`,
            submission: updatedSubmission,
            evalResult
        });

    } catch (error) {
        console.error("Error creating/evaluating submission:", error);

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