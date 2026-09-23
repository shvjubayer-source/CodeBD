const pool=require("../config/db");


async function findUserByEmail(email) {
    const result = await pool.query(
        `SELECT * FROM users WHERE email = $1`,
        [email]
    );

    return result.rows[0];
}

async function findById(userId) {
    const result = await pool.query(
        `SELECT *, fn_get_user_rating_tier(user_id) AS tier FROM users WHERE user_id = $1`,
        [userId]
    );

    return result.rows[0];
}

async function findByUsername(username)  {
    const result = await pool.query(
        `SELECT * FROM users
        WHERE username=$1`,
        [username]
    );

    return result.rows[0];
}

async function  getAllUsers() {
    const result=await pool.query(
        `SELECT * FROM users`,
    );

    return result.rows;
}


async function createUser(username, email, password) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query(
            `INSERT INTO users (username, email, password)
             VALUES ($1, $2, $3)
             RETURNING user_id, username, email, role, rating, created_at`,
            [username, email, password]
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

async function getSolveCount(userId){
    const result=await pool.query(
        `SELECT COUNT(DISTINCT problem_id) AS solve_count
        FROM submissions s
        WHERE s.user_id=$1
        AND s.verdict='Accepted'`,
        [userId]
    );

    return Number(result.rows[0].solve_count);
}

/**
 * Calculates Difficulty Index (DI):
 * DI = SUM(DifficultyWeight) / SolvedProblems
 * Weights: Easy = 1, Medium = 2, Hard = 3
 */
async function getDifficultyStats(userId) {
    const result = await pool.query(
        `SELECT 
            COUNT(DISTINCT p.problem_id)::INT AS total_solved,
            COALESCE(SUM(
                CASE LOWER(p.difficulty)
                    WHEN 'easy' THEN 1
                    WHEN 'medium' THEN 2
                    WHEN 'hard' THEN 3
                    ELSE 0
                END
            ), 0)::NUMERIC AS total_weight
         FROM (
             SELECT DISTINCT s.problem_id, p.difficulty
             FROM submissions s
             JOIN problems p ON s.problem_id = p.problem_id
             WHERE s.user_id = $1 AND s.verdict = 'Accepted'
         ) p`,
        [userId]
    );

    const totalSolved = Number(result.rows[0]?.total_solved) || 0;
    const totalWeight = Number(result.rows[0]?.total_weight) || 0;
    const difficultyIndex = totalSolved > 0 ? Number((totalWeight / totalSolved).toFixed(1)) : 0;

    let descriptor = "No Solves";
    if (totalSolved > 0) {
        if (difficultyIndex < 1.4) descriptor = "Mostly Easy";
        else if (difficultyIndex < 1.8) descriptor = "Easy / Medium";
        else if (difficultyIndex < 2.3) descriptor = "Mostly Medium";
        else if (difficultyIndex < 2.8) descriptor = "Medium / Hard";
        else descriptor = "Mostly Hard";
    }

    return {
        difficultyIndex,
        totalSolved,
        totalWeight,
        descriptor
    };
}


async function getSubmissions(userId) {
    const result=await pool.query(
        `SELECT *, 
        (
          SELECT username
          FROM users u
          WHERE u.user_id=s.user_id
        ) as user_name,
        (
          SELECT title
          FROM problems p
          WHERE s.problem_id=p.problem_id
        ) as problem_name
        FROM submissions s
        WHERE s.user_id=$1`,
        [userId]
    );

    return result.rows;
}




async function getUserAnalytics(userId) {
    const [ratingHistRes, solvesDiffRes, verdictDistRes, activityRes, userRes] = await Promise.all([
        pool.query(`
            SELECT 
                cp.contest_id,
                c.title AS contest_title,
                TO_CHAR(c.start_time, 'YYYY-MM-DD') AS contest_date,
                cp.prev_rating,
                cp.rating_change,
                COALESCE(cp.prev_rating + cp.rating_change, u.rating) AS new_rating,
                cp.solve_count,
                cp.score,
                cp.penalty
            FROM contest_participation cp
            JOIN contest c ON cp.contest_id = c.contest_id
            JOIN users u ON cp.user_id = u.user_id
            WHERE cp.user_id = $1
            ORDER BY c.start_time ASC, cp.registered_at ASC
        `, [userId]),
        pool.query(`
            SELECT 
                p.difficulty,
                COUNT(DISTINCT p.problem_id)::INT AS count
            FROM submissions s
            JOIN problems p ON s.problem_id = p.problem_id
            WHERE s.user_id = $1 AND s.verdict = 'Accepted'
            GROUP BY p.difficulty
            ORDER BY 
                CASE LOWER(p.difficulty)
                    WHEN 'easy' THEN 1
                    WHEN 'medium' THEN 2
                    WHEN 'hard' THEN 3
                    ELSE 4
                END
        `, [userId]),
        pool.query(`
            SELECT 
                COALESCE(verdict, 'Pending') AS verdict,
                COUNT(*)::INT AS count
            FROM submissions
            WHERE user_id = $1
            GROUP BY verdict
            ORDER BY count DESC
        `, [userId]),
        pool.query(`
            SELECT 
                TO_CHAR(submitted_at, 'YYYY-MM-DD') AS date,
                COUNT(*)::INT AS count
            FROM submissions
            WHERE user_id = $1
            GROUP BY TO_CHAR(submitted_at, 'YYYY-MM-DD')
            ORDER BY date ASC
            LIMIT 30
        `, [userId]),
        pool.query(`
            SELECT rating, created_at, username, fn_get_user_rating_tier(user_id) AS tier
            FROM users
            WHERE user_id = $1
        `, [userId])
    ]);

    const user = userRes.rows[0] || {};

    let totalSolved = 0;
    let totalWeight = 0;
    for (const row of solvesDiffRes.rows) {
        const count = Number(row.count) || 0;
        const diff = (row.difficulty || "").toLowerCase();
        let weight = 0;
        if (diff === "easy") weight = 1;
        else if (diff === "medium") weight = 2;
        else if (diff === "hard") weight = 3;
        totalSolved += count;
        totalWeight += weight * count;
    }
    const difficultyIndex = totalSolved > 0 ? Number((totalWeight / totalSolved).toFixed(1)) : 0;
    let descriptor = "No Solves";
    if (totalSolved > 0) {
        if (difficultyIndex < 1.4) descriptor = "Mostly Easy";
        else if (difficultyIndex < 1.8) descriptor = "Easy / Medium";
        else if (difficultyIndex < 2.3) descriptor = "Mostly Medium";
        else if (difficultyIndex < 2.8) descriptor = "Medium / Hard";
        else descriptor = "Mostly Hard";
    }

    return {
        currentRating: user.rating || 0,
        ratingTier: user.tier || "Newbie (<1000)",
        createdAt: user.created_at,
        ratingHistory: ratingHistRes.rows,
        solvesByDifficulty: solvesDiffRes.rows,
        verdictDistribution: verdictDistRes.rows,
        activityTimeline: activityRes.rows,
        difficultyStats: {
            difficultyIndex,
            totalSolved,
            totalWeight,
            descriptor
        }
    };
}

async function updatePassword(userId, hashedPassword) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query(
            `UPDATE users SET password = $1 WHERE user_id = $2 RETURNING user_id, username, email`,
            [hashedPassword, userId]
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

module.exports={
    findUserByEmail,
    findById,
    findByUsername,
    getAllUsers,
    createUser,
    getSolveCount,
    getDifficultyStats,
    getSubmissions,
    getUserAnalytics,
    updatePassword
}