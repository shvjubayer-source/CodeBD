const pool = require("../config/db");

async function getProblems(userId) {
    console.log("Inside Problem Models");

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
                JOIN tags t
                    ON pt.tag_id = t.tag_id
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

module.exports = {
    getProblems
};