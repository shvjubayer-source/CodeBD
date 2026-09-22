const Prob = require("../models/problemModel");


async function getProblems(req, res) {
    try {
        const userId = req.user.userId;
        const problems = await Prob.getProblems(userId);
        res.json(problems);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
}


async function getProblemById(req, res) {
    try {
        const problemId = req.params.id;
        const userId = req.user ? req.user.userId : null;

        const problem = await Prob.getProblemById(problemId);

        if (!problem) {
            return res.status(404).json({ message: "Problem not found" });
        }

        // Attach tags for the problem
        const tags = await Prob.getProblemTags(problemId);
        problem.tags = tags.map(t => t.tag_name).join(", ");

        // If user is authenticated, attach verdict & bookmark status
        if (userId) {
            const extra = await Prob.getProblemForUser(problemId, userId);
            problem.verdict       = extra ? extra.verdict       : null;
            problem.is_bookmarked = extra ? extra.is_bookmarked : false;
        }

        return res.status(200).json(problem);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
}


async function createProblem(req, res) {
    try {
        const { title, statement, difficulty, time_limit, memory_limit } = req.body;

        if (!title || !statement || !difficulty || !time_limit || !memory_limit) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const problem = await Prob.addProblem(title, statement, difficulty, time_limit, memory_limit);

        return res.status(201).json({
            message: "Problem created successfully",
            problem
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}


async function updateProblem(req, res) {
    try {
        const problemId = req.params.id;
        const { title, statement, difficulty, time_limit, memory_limit } = req.body;

        if (!title || !statement || !difficulty || !time_limit || !memory_limit) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const problem = await Prob.updateProblem(problemId, title, statement, difficulty, time_limit, memory_limit);

        if (!problem) {
            return res.status(404).json({ message: "Problem not found" });
        }

        return res.status(200).json({
            message: "Problem updated successfully",
            problem
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}


async function deleteProblem(req, res) {
    try {
        const problemId = req.params.id;
        const problem = await Prob.deleteProblem(problemId);

        if (!problem) {
            return res.status(404).json({ message: "Problem not found" });
        }

        return res.status(200).json({
            message: "Problem deleted successfully",
            problem
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}


async function getProblemSolution(req, res) {
    try {
        const problemId = req.params.id;
        const solution = await Prob.getProblemSolution(problemId);

        if (!solution) {
            return res.status(404).json({ message: "Editorial not found for this problem" });
        }

        return res.status(200).json(solution);
    } catch (err) {
        console.error("getProblemSolution error:", err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

async function saveProblemSolution(req, res) {
    try {
        const problemId = req.params.id;
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: "Editorial content is required" });
        }

        const solution = await Prob.saveProblemSolution(problemId, content.trim());
        return res.status(200).json({
            message: "Editorial saved successfully",
            solution
        });
    } catch (err) {
        console.error("saveProblemSolution error:", err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

module.exports = {
    getProblems,
    getProblemById,
    createProblem,
    updateProblem,
    deleteProblem,
    getProblemSolution,
    saveProblemSolution
};
