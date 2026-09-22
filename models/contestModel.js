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
    const result = await pool.query(
        `
        INSERT INTO contest_participation (user_id, contest_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, contest_id) DO NOTHING
        RETURNING *
        `,
        [userId, contestId]
    );
    return result.rows[0];
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

module.exports = {
    getAllContests,
    getContestById,
    getContestProblems,
    registerParticipant,
    getContestRanking
};
