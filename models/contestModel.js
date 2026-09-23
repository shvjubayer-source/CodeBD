const pool = require("../config/db");

async function getAllContests(userId = null) {
    if (userId) {
        const result = await pool.query(
            `
            SELECT
                c.*,
                COUNT(DISTINCT cp.user_id) AS participant_count,
                EXISTS (
                    SELECT 1 FROM contest_participation cp2
                    WHERE cp2.contest_id = c.contest_id AND cp2.user_id = $1
                ) AS is_registered
            FROM contest c
            LEFT JOIN contest_participation cp ON c.contest_id = cp.contest_id
            GROUP BY c.contest_id
            ORDER BY c.start_time DESC
            `,
            [userId]
        );
        return result.rows;
    } else {
        const result = await pool.query(
            `
            SELECT
                c.*,
                COUNT(DISTINCT cp.user_id) AS participant_count,
                FALSE AS is_registered
            FROM contest c
            LEFT JOIN contest_participation cp ON c.contest_id = cp.contest_id
            GROUP BY c.contest_id
            ORDER BY c.start_time DESC
            `
        );
        return result.rows;
    }
}

async function getContestById(contestId) {
    const result = await pool.query(
        `SELECT * FROM contest WHERE contest_id = $1`,
        [contestId]
    );
    return result.rows[0];
}

async function getContestProblems(contestId) {
    const result = await pool.query(
        `
        SELECT
            p.problem_id,
            p.title,
            p.difficulty,
            cp.problem_label,
            cp.problem_order,
            cp.points
        FROM contest_problem cp
        JOIN problems p ON cp.problem_id = p.problem_id
        WHERE cp.contest_id = $1
        ORDER BY cp.problem_order
        `,
        [contestId]
    );
    return result.rows;
}

async function registerParticipant(userId, contestId) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        // Invoke stored procedure for multi-step registration workflow
        await client.query(
            `CALL sp_register_contest_participant($1, $2)`,
            [userId, contestId]
        );
        const result = await client.query(
            `SELECT * FROM contest_participation WHERE user_id = $1 AND contest_id = $2`,
            [userId, contestId]
        );
        await client.query("COMMIT");
        return result.rows[0];
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

async function getContestRanking(contestId) {
    const result = await pool.query(
        `
        SELECT
            cp.user_id,
            u.username,
            cp.solve_count,
            cp.score,
            cp.penalty,
            cp.rating_change
        FROM contest_participation cp
        JOIN users u ON cp.user_id = u.user_id
        WHERE cp.contest_id = $1
        ORDER BY cp.score DESC, cp.penalty ASC
        `,
        [contestId]
    );
    return result.rows;
}

// ── Transaction Control Example: Atomic Contest Creation ──────────────────────
// Creates contest and links contest problems atomically.
async function createContestWithProblems({ title, description, start_time, end_time }, problemAssignments = []) {
    const client = await pool.connect(); // 1. Acquire dedicated connection from pool
    try {
        await client.query("BEGIN"); // 2. Start Transaction Control

        // Step A: Insert contest record
        const contestRes = await client.query(
            `INSERT INTO contest (title, description, start_time, end_time)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [title, description, start_time, end_time]
        );
        const contest = contestRes.rows[0];

        // Step B: Insert contest problems
        if (Array.isArray(problemAssignments) && problemAssignments.length > 0) {
            for (let i = 0; i < problemAssignments.length; i++) {
                const p = problemAssignments[i];
                await client.query(
                    `INSERT INTO contest_problem (contest_id, problem_id, problem_order, problem_label, points)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [
                        contest.contest_id,
                        p.problem_id,
                        p.problem_order || (i + 1),
                        p.problem_label || String.fromCharCode(65 + i), // 'A', 'B', 'C'
                        p.points || 100
                    ]
                );
            }
        }

        await client.query("COMMIT"); // 3. Commit transaction
        return contest;
    } catch (err) {
        await client.query("ROLLBACK"); // 4. Rollback transaction if any step fails
        throw err;
    } finally {
        client.release(); // 5. Release connection
    }
}


module.exports = {
    getAllContests,
    getContestById,
    getContestProblems,
    registerParticipant,
    getContestRanking,
    createContestWithProblems
};
