const pool = require("../config/db");

async function getBookmarks(userId) {
    const result = await pool.query(
        `
        SELECT
            p.problem_id,
            p.title,
            p.statement,
            p.difficulty,
            (
                SELECT STRING_AGG(
                    DISTINCT t.tag_name,
                    ', ' ORDER BY t.tag_name
                )
                FROM problem_tags pt
                JOIN tags t ON pt.tag_id = t.tag_id
                WHERE pt.problem_id = p.problem_id
            ) AS tags,
            TRUE AS is_bookmarked,
            CASE
                WHEN EXISTS (
                    SELECT 1 FROM submissions s
                    WHERE s.problem_id = p.problem_id
                    AND s.user_id = $1
                    AND s.verdict = 'Accepted'
                ) THEN 'Accepted'
                ELSE (
                    SELECT s.verdict
                    FROM submissions s
                    WHERE s.problem_id = p.problem_id
                    AND s.user_id = $1
                    ORDER BY s.submission_id DESC
                    LIMIT 1
                )
            END AS verdict
        FROM bookmarks b
        JOIN problems p ON b.problem_id = p.problem_id
        WHERE b.user_id = $1
        ORDER BY p.problem_id
        `,
        [userId]
    );

    return result.rows;
}

async function addBookmark(userId, problemId) {
    const result = await pool.query(
        `
        INSERT INTO bookmarks (user_id, problem_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, problem_id)
        DO NOTHING
        RETURNING *;
        `,
        [userId, problemId]
    );

    return result.rows[0];
}

async function removeBookmark(userId, problemId) {
    const result = await pool.query(
        `
        DELETE FROM bookmarks
        WHERE user_id = $1
          AND problem_id = $2
        RETURNING *;
        `,
        [userId, problemId]
    );

    return result.rows[0];
}

module.exports = {
    getBookmarks,
    addBookmark,
    removeBookmark
};