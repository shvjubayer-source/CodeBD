const pool = require("../config/db");

// ── Get all blog posts ────────────────────────────────────────────────────────
async function getAllBlogPosts(userId = null, { tag = null, search = null } = {}) {
    let query = `
        SELECT 
            bp.post_id,
            bp.title,
            bp.content,
            bp.user_id,
            u.username AS author_name,
            u.role AS author_role,
            COALESCE(
                (SELECT STRING_AGG(t.tag_name, ', ') 
                 FROM blog_tag bt 
                 JOIN tags t ON bt.tag_id = t.tag_id 
                 WHERE bt.post_id = bp.post_id), 
                ''
            ) AS tags,
            COALESCE(
                (SELECT COUNT(*) FROM blog_like bl WHERE bl.post_id = bp.post_id AND bl.type = 'like'), 
                0
            )::int AS likes_count,
            COALESCE(
                (SELECT COUNT(*) FROM blog_like bl WHERE bl.post_id = bp.post_id AND bl.type = 'dislike'), 
                0
            )::int AS dislikes_count,
            COALESCE(
                (SELECT COUNT(*) FROM blog_comment bc WHERE bc.post_id = bp.post_id), 
                0
            )::int AS comments_count,
            ${userId ? `(SELECT type FROM blog_like WHERE post_id = bp.post_id AND user_id = $1)` : `NULL`} AS user_vote,
            ${userId ? `EXISTS(SELECT 1 FROM blog_bookmarks WHERE post_id = bp.post_id AND user_id = $1)` : `false`} AS is_bookmarked
        FROM blog_post bp
        JOIN users u ON bp.user_id = u.user_id
        WHERE 1=1
    `;

    const params = [];
    if (userId) {
        params.push(userId);
    }

    if (tag) {
        params.push(tag);
        const tagParamIndex = params.length;
        query += `
            AND bp.post_id IN (
                SELECT bt.post_id 
                FROM blog_tag bt 
                JOIN tags t ON bt.tag_id = t.tag_id 
                WHERE LOWER(t.tag_name) = LOWER($${tagParamIndex})
            )
        `;
    }

    if (search) {
        params.push(`%${search}%`);
        const searchParamIndex = params.length;
        query += `
            AND (bp.title ILIKE $${searchParamIndex} OR bp.content ILIKE $${searchParamIndex})
        `;
    }

    query += ` ORDER BY bp.post_id DESC`;

    const result = await pool.query(query, params);
    return result.rows;
}


// ── Get single blog post by ID ────────────────────────────────────────────────
async function getBlogPostById(postId, userId = null) {
    const query = `
        SELECT 
            bp.post_id,
            bp.title,
            bp.content,
            bp.user_id,
            u.username AS author_name,
            u.role AS author_role,
            COALESCE(
                (SELECT STRING_AGG(t.tag_name, ', ') 
                 FROM blog_tag bt 
                 JOIN tags t ON bt.tag_id = t.tag_id 
                 WHERE bt.post_id = bp.post_id), 
                ''
            ) AS tags,
            COALESCE(
                (SELECT COUNT(*) FROM blog_like bl WHERE bl.post_id = bp.post_id AND bl.type = 'like'), 
                0
            )::int AS likes_count,
            COALESCE(
                (SELECT COUNT(*) FROM blog_like bl WHERE bl.post_id = bp.post_id AND bl.type = 'dislike'), 
                0
            )::int AS dislikes_count,
            COALESCE(
                (SELECT COUNT(*) FROM blog_comment bc WHERE bc.post_id = bp.post_id), 
                0
            )::int AS comments_count,
            ${userId ? `(SELECT type FROM blog_like WHERE post_id = bp.post_id AND user_id = $2)` : `NULL`} AS user_vote,
            ${userId ? `EXISTS(SELECT 1 FROM blog_bookmarks WHERE post_id = bp.post_id AND user_id = $2)` : `false`} AS is_bookmarked
        FROM blog_post bp
        JOIN users u ON bp.user_id = u.user_id
        WHERE bp.post_id = $1
    `;

    const params = [postId];
    if (userId) params.push(userId);

    const result = await pool.query(query, params);
    return result.rows[0] || null;
}


// ── Create blog post ──────────────────────────────────────────────────────────
async function createBlogPost(userId, title, content, tagIds = []) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const postRes = await client.query(
            `INSERT INTO blog_post (user_id, title, content)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [userId, title, content]
        );
        const post = postRes.rows[0];

        if (Array.isArray(tagIds) && tagIds.length > 0) {
            for (const tagId of tagIds) {
                await client.query(
                    `INSERT INTO blog_tag (post_id, tag_id)
                     VALUES ($1, $2)
                     ON CONFLICT DO NOTHING`,
                    [post.post_id, tagId]
                );
            }
        }

        await client.query("COMMIT");
        return post;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}


// ── Delete blog post ──────────────────────────────────────────────────────────
async function deleteBlogPost(postId, userId, isAdmin = false) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        let query = `DELETE FROM blog_post WHERE post_id = $1`;
        const params = [postId];

        if (!isAdmin) {
            query += ` AND user_id = $2`;
            params.push(userId);
        }

        query += ` RETURNING *`;
        const result = await client.query(query, params);
        await client.query("COMMIT");
        return result.rows[0] || null;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}


// ── Comments ──────────────────────────────────────────────────────────────────
async function getCommentsByPost(postId) {
    const result = await pool.query(
        `SELECT 
            bc.comment_id,
            bc.post_id,
            bc.user_id,
            bc.text,
            u.username,
            u.role
         FROM blog_comment bc
         JOIN users u ON bc.user_id = u.user_id
         WHERE bc.post_id = $1
         ORDER BY bc.comment_id ASC`,
        [postId]
    );
    return result.rows;
}

async function addComment(postId, userId, text) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query(
            `INSERT INTO blog_comment (post_id, user_id, text)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [postId, userId, text]
        );

        const comment = result.rows[0];
        const userRes = await client.query(
            `SELECT username, role FROM users WHERE user_id = $1`,
            [userId]
        );
        await client.query("COMMIT");

        const u = userRes.rows[0];
        return {
            ...comment,
            username: u ? u.username : "Unknown",
            role: u ? u.role : "coder"
        };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

async function deleteComment(commentId, userId, isAdmin = false) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        let query = `DELETE FROM blog_comment WHERE comment_id = $1`;
        const params = [commentId];

        if (!isAdmin) {
            query += ` AND user_id = $2`;
            params.push(userId);
        }

        query += ` RETURNING *`;
        const result = await client.query(query, params);
        await client.query("COMMIT");
        return result.rows[0] || null;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}


// ── Votes / Likes ─────────────────────────────────────────────────────────────
async function toggleVote(postId, userId, type) {
    if (!['like', 'dislike'].includes(type)) {
        throw new Error("Invalid vote type");
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const existing = await client.query(
            `SELECT type FROM blog_like WHERE post_id = $1 AND user_id = $2`,
            [postId, userId]
        );

        let currentVote = null;

        if (existing.rows.length > 0) {
            if (existing.rows[0].type === type) {
                // Already voted this -> un-vote
                await client.query(
                    `DELETE FROM blog_like WHERE post_id = $1 AND user_id = $2`,
                    [postId, userId]
                );
                currentVote = null;
            } else {
                // Switch vote type
                await client.query(
                    `UPDATE blog_like SET type = $3 WHERE post_id = $1 AND user_id = $2`,
                    [postId, userId, type]
                );
                currentVote = type;
            }
        } else {
            // New vote
            await client.query(
                `INSERT INTO blog_like (post_id, user_id, type) VALUES ($1, $2, $3)`,
                [postId, userId, type]
            );
            currentVote = type;
        }

        // Get updated counts
        const counts = await client.query(
            `SELECT 
                COALESCE(COUNT(CASE WHEN type = 'like' THEN 1 END), 0)::int AS likes_count,
                COALESCE(COUNT(CASE WHEN type = 'dislike' THEN 1 END), 0)::int AS dislikes_count
             FROM blog_like 
             WHERE post_id = $1`,
            [postId]
        );
        await client.query("COMMIT");

        return {
            userVote: currentVote,
            likesCount: counts.rows[0].likes_count,
            dislikesCount: counts.rows[0].dislikes_count
        };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}


// ── Bookmarks ─────────────────────────────────────────────────────────────────
async function toggleBookmark(postId, userId) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const existing = await client.query(
            `SELECT 1 FROM blog_bookmarks WHERE post_id = $1 AND user_id = $2`,
            [postId, userId]
        );

        let isBookmarked = false;
        if (existing.rows.length > 0) {
            await client.query(
                `DELETE FROM blog_bookmarks WHERE post_id = $1 AND user_id = $2`,
                [postId, userId]
            );
            isBookmarked = false;
        } else {
            await client.query(
                `INSERT INTO blog_bookmarks (post_id, user_id) VALUES ($1, $2)`,
                [postId, userId]
            );
            isBookmarked = true;
        }
        await client.query("COMMIT");
        return { isBookmarked };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}


// ── Get Bookmarked Posts ──────────────────────────────────────────────────────
async function getUserBookmarkedPosts(userId) {
    const query = `
        SELECT 
            bp.post_id,
            bp.title,
            bp.content,
            bp.user_id,
            u.username AS author_name,
            COALESCE(
                (SELECT STRING_AGG(t.tag_name, ', ') 
                 FROM blog_tag bt 
                 JOIN tags t ON bt.tag_id = t.tag_id 
                 WHERE bt.post_id = bp.post_id), 
                ''
            ) AS tags,
            (SELECT COUNT(*) FROM blog_like bl WHERE bl.post_id = bp.post_id AND bl.type = 'like')::int AS likes_count,
            (SELECT COUNT(*) FROM blog_comment bc WHERE bc.post_id = bp.post_id)::int AS comments_count
        FROM blog_bookmarks bb
        JOIN blog_post bp ON bb.post_id = bp.post_id
        JOIN users u ON bp.user_id = u.user_id
        WHERE bb.user_id = $1
        ORDER BY bp.post_id DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
}

module.exports = {
    getAllBlogPosts,
    getBlogPostById,
    createBlogPost,
    deleteBlogPost,
    getCommentsByPost,
    addComment,
    deleteComment,
    toggleVote,
    toggleBookmark,
    getUserBookmarkedPosts
};
