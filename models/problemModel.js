const pool = require("../config/db");

async function getProblems(userId) {
    const result = await pool.query(
        `
        SELECT
            p.problem_id,
            p.title,
            p.statement,
            p.difficulty,
            p.time_limit,
            p.memory_limit,

            (
                SELECT STRING_AGG(
                    DISTINCT t.tag_name,
                    ', ' ORDER BY t.tag_name
                )
                FROM problem_tags pt
                JOIN tags t ON pt.tag_id = t.tag_id
                WHERE pt.problem_id = p.problem_id
            ) AS tags,

            EXISTS (
                SELECT 1
                FROM bookmarks b
                WHERE b.problem_id = p.problem_id
                  AND b.user_id = $1
            ) AS is_bookmarked,

            CASE
                WHEN EXISTS (
                    SELECT 1
                    FROM submissions s
                    WHERE s.problem_id = p.problem_id
                      AND s.user_id = $1
                      AND s.verdict = 'Accepted'
                )
                THEN 'Accepted'
                ELSE (
                    SELECT s.verdict
                    FROM submissions s
                    WHERE s.problem_id = p.problem_id
                      AND s.user_id = $1
                    ORDER BY s.submission_id DESC
                    LIMIT 1
                )
            END AS verdict

        FROM problems p
        ORDER BY p.problem_id;
        `,
        [userId]
    );

    return result.rows;
}


async function getProblemById(problemId) {
    const result = await pool.query(
        `
        SELECT *
        FROM problems
        WHERE problem_id = $1
        `,
        [problemId]
    );

    return result.rows[0];
}


async function getProblemTags(problemId) {
    const result = await pool.query(
        `
        SELECT t.tag_name
        FROM problem_tags pt
        JOIN tags t ON pt.tag_id = t.tag_id
        WHERE pt.problem_id = $1
        ORDER BY t.tag_name
        `,
        [problemId]
    );

    return result.rows;
}


async function getProblemForUser(problemId, userId) {
    const result = await pool.query(
        `
        SELECT
            EXISTS (
                SELECT 1 FROM bookmarks b
                WHERE b.problem_id = $1 AND b.user_id = $2
            ) AS is_bookmarked,

            CASE
                WHEN EXISTS (
                    SELECT 1 FROM submissions s
                    WHERE s.problem_id = $1 AND s.user_id = $2
                      AND s.verdict = 'Accepted'
                ) THEN 'Accepted'
                ELSE (
                    SELECT s.verdict FROM submissions s
                    WHERE s.problem_id = $1 AND s.user_id = $2
                    ORDER BY s.submission_id DESC
                    LIMIT 1
                )
            END AS verdict
        `,
        [problemId, userId]
    );

    return result.rows[0];
}


async function addProblem(title, statement, difficulty, timeLimit, memoryLimit) {
    const result = await pool.query(
        `
        INSERT INTO problems (title, statement, difficulty, time_limit, memory_limit)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [title, statement, difficulty, timeLimit, memoryLimit]
    );

    return result.rows[0];
}


async function updateProblem(problemId, title, statement, difficulty, timeLimit, memoryLimit) {
    const result = await pool.query(
        `
        UPDATE problems
        SET
            title        = $1,
            statement    = $2,
            difficulty   = $3,
            time_limit   = $4,
            memory_limit = $5
        WHERE problem_id = $6
        RETURNING *
        `,
        [title, statement, difficulty, timeLimit, memoryLimit, problemId]
    );

    return result.rows[0];
}


async function deleteProblem(problemId) {
    const result = await pool.query(
        `
        DELETE FROM problems
        WHERE problem_id = $1
        RETURNING *
        `,
        [problemId]
    );

    return result.rows[0];
}


async function getProblemSolution(problemId) {
    const result = await pool.query(
        `SELECT solution_id, problem_id, content FROM solution WHERE problem_id = $1`,
        [problemId]
    );
    return result.rows[0];
}

async function saveProblemSolution(problemId, content) {
    const existing = await pool.query(
        `SELECT solution_id FROM solution WHERE problem_id = $1`,
        [problemId]
    );
    if (existing.rows.length > 0) {
        const update = await pool.query(
            `UPDATE solution SET content = $1 WHERE problem_id = $2 RETURNING *`,
            [content, problemId]
        );
        return update.rows[0];
    } else {
        const insert = await pool.query(
            `INSERT INTO solution (problem_id, content) VALUES ($1, $2) RETURNING *`,
            [problemId, content]
        );
        return insert.rows[0];
    }
}


// ── Transaction Control Example: Atomic Problem Creation ──────────────────────
// Creates problem, testcases, tags, and solution within a single atomic transaction.
async function createProblemWithDetails({ title, statement, difficulty, timeLimit, memoryLimit }, testcases = [], tagIds = [], solutionContent = null) {
    const client = await pool.connect(); // 1. Acquire dedicated connection from pool
    try {
        await client.query("BEGIN"); // 2. Start Transaction Control

        // Step A: Insert problem record
        const probRes = await client.query(
            `INSERT INTO problems (title, statement, difficulty, time_limit, memory_limit)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [title, statement, difficulty, timeLimit, memoryLimit]
        );
        const problem = probRes.rows[0];

        // Step B: Insert associated testcases
        if (Array.isArray(testcases) && testcases.length > 0) {
            for (const tc of testcases) {
                await client.query(
                    `INSERT INTO testcase (problem_id, input, expected_output)
                     VALUES ($1, $2, $3)`,
                    [problem.problem_id, tc.input || "", tc.expected_output || ""]
                );
            }
        }

        // Step C: Link problem tags
        if (Array.isArray(tagIds) && tagIds.length > 0) {
            for (const tagId of tagIds) {
                await client.query(
                    `INSERT INTO problem_tags (problem_id, tag_id)
                     VALUES ($1, $2)
                     ON CONFLICT DO NOTHING`,
                    [problem.problem_id, tagId]
                );
            }
        }

        // Step D: Insert initial editorial/solution if provided
        if (solutionContent && solutionContent.trim()) {
            await client.query(
                `INSERT INTO solution (problem_id, content)
                 VALUES ($1, $2)`,
                [problem.problem_id, solutionContent.trim()]
            );
        }

        await client.query("COMMIT"); // 3. Commit transaction if all succeeded
        return problem;
    } catch (err) {
        await client.query("ROLLBACK"); // 4. Rollback transaction if any step failed
        throw err;
    } finally {
        client.release(); // 5. Release connection back to pool
    }
}


module.exports = {
    getProblems,
    getProblemById,
    getProblemTags,
    getProblemForUser,
    addProblem,
    updateProblem,
    deleteProblem,
    getProblemSolution,
    saveProblemSolution,
    createProblemWithDetails
};