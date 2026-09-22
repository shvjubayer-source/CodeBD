const pool = require("../config/db");

async function createSubmission(userId, problemId, language, code) {
    // In a real judge system, verdict would be determined by running code.
    // Here we store the submission with a 'Pending' verdict.
    const result = await pool.query(
        `
        INSERT INTO submissions (user_id, problem_id, language, code, verdict)
        VALUES ($1, $2, $3, $4, 'Pending')
        RETURNING *
        `,
        [userId, problemId, language, code]
    );

    return result.rows[0];
}

async function getUserSubmissions(userId) {
    const result = await pool.query(
        `
        SELECT
            s.*,
            u.username AS user_name,
            p.title    AS problem_name
        FROM submissions s
        JOIN users   u ON s.user_id    = u.user_id
        JOIN problems p ON s.problem_id = p.problem_id
        WHERE s.user_id = $1
        ORDER BY s.submitted_at DESC
        `,
        [userId]
    );

    return result.rows;
}

async function getProblemTestCases(problemId) {
    const result = await pool.query(
        `
        SELECT input, expected_output
        FROM testcase
        WHERE problem_id = $1
        ORDER BY test_id ASC
        `,
        [problemId]
    );
    return result.rows;
}

async function getProblemConstraints(problemId) {
    const result = await pool.query(
        `
        SELECT time_limit, memory_limit
        FROM problems
        WHERE problem_id = $1
        `,
        [problemId]
    );
    return result.rows[0];
}

async function updateSubmissionResult(submissionId, verdict, executionTimeMs, memoryUsedKb = null) {
    const result = await pool.query(
        `
        UPDATE submissions
        SET
            verdict = $1,
            execution_time = $2,
            memory_used = $3
        WHERE submission_id = $4
        RETURNING *
        `,
        [verdict, executionTimeMs, memoryUsedKb, submissionId]
    );
    return result.rows[0];
}

module.exports = {
    createSubmission,
    getUserSubmissions,
    getProblemTestCases,
    getProblemConstraints,
    updateSubmissionResult
};
