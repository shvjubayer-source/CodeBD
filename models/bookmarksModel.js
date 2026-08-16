const pool = require("../config/db");

async function addBookmark(userId, problemId) {
    console.log("inside addbookmarks model");
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
    addBookmark,
    removeBookmark
};