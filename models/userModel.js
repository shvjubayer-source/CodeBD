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
        `SELECT * FROM users WHERE user_id = $1`,
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


async function createUser(username, email, password){

    const result=await pool.query(
        `INSERT INTO users (username, email, password)
        VALUES ($1, $2, $3)
        RETURNING username, email, created_at`,
        [username, email, password]

    );

    return result.rows[0];
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
            SELECT rating, created_at, username
            FROM users
            WHERE user_id = $1
        `, [userId])
    ]);

    const user = userRes.rows[0] || {};

    return {
        currentRating: user.rating || 0,
        createdAt: user.created_at,
        ratingHistory: ratingHistRes.rows,
        solvesByDifficulty: solvesDiffRes.rows,
        verdictDistribution: verdictDistRes.rows,
        activityTimeline: activityRes.rows
    };
}

module.exports={
    findUserByEmail,
    findById,
    findByUsername,
    getAllUsers,
    createUser,
    getSolveCount,
    getSubmissions,
    getUserAnalytics
}