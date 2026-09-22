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

// ── Transaction Control Example: Finalizing Submission with Atomic User Stats ──
// Atomically updates submission verdict, runtime, and conditionally increments user rating / contest score.
async function finalizeSubmissionWithStats(submissionId, userId, problemId, verdict, executionTimeMs, memoryUsedKb = null) {
    const client = await pool.connect(); // 1. Acquire dedicated connection from pool
    try {
        await client.query("BEGIN"); // 2. Start Transaction Control

        // Step A: Update submission record
        const subRes = await client.query(
            `UPDATE submissions
             SET verdict = $1, execution_time = $2, memory_used = $3
             WHERE submission_id = $4
             RETURNING *`,
            [verdict, executionTimeMs, memoryUsedKb, submissionId]
        );

        // Step B: If Accepted, update user rating if first time solving this problem
        if (verdict === "Accepted") {
            const prevAcRes = await client.query(
                `SELECT submission_id FROM submissions 
                 WHERE user_id = $1 AND problem_id = $2 AND verdict = 'Accepted' AND submission_id != $3`,
                [userId, problemId, submissionId]
            );

            if (prevAcRes.rows.length === 0) {
                // First-time solve award: +5 rating
                await client.query(
                    `UPDATE users SET rating = rating + 5 WHERE user_id = $1`,
                    [userId]
                );

                // Update active contest participation if problem belongs to an ongoing contest
                await client.query(
                    `UPDATE contest_participation cp
                     SET solve_count = solve_count + 1,
                         score = score + cp_prob.points
                     FROM contest_problem cp_prob
                     JOIN contest c ON cp_prob.contest_id = c.contest_id
                     WHERE cp.contest_id = cp_prob.contest_id 
                       AND cp.user_id = $1 
                       AND cp_prob.problem_id = $2
                       AND NOW() BETWEEN c.start_time AND c.end_time`,
                    [userId, problemId]
                );
            }
        }

        await client.query("COMMIT"); // 3. Commit transaction
        return subRes.rows[0];
    } catch (err) {
        await client.query("ROLLBACK"); // 4. Rollback transaction if any query fails
        throw err;
    } finally {
        client.release(); // 5. Release connection back to pool
    }
}


module.exports = {
    createSubmission,
    getUserSubmissions,
    getProblemTestCases,
    getProblemConstraints,
    updateSubmissionResult,
    finalizeSubmissionWithStats
};
