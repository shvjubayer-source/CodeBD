const blogModel = require("../models/blogModel");

async function getPosts(req, res) {
    try {
        const userId = req.user ? (req.user.userId || req.user.user_id) : null;
        const { tag, search } = req.query;

        const posts = await blogModel.getAllBlogPosts(userId, { tag, search });
        return res.status(200).json(posts);
    } catch (err) {
        console.error("getPosts error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function getPostById(req, res) {
    try {
        const userId = req.user ? (req.user.userId || req.user.user_id) : null;
        const postId = req.params.id;

        const post = await blogModel.getBlogPostById(postId, userId);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        return res.status(200).json(post);
    } catch (err) {
        console.error("getPostById error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function createPost(req, res) {
    try {
        const userId = req.user.userId || req.user.user_id;
        const { title, content, tagIds } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ message: "Title is required" });
        }
        if (!content || !content.trim()) {
            return res.status(400).json({ message: "Content is required" });
        }

        const post = await blogModel.createBlogPost(userId, title.trim(), content.trim(), tagIds || []);
        return res.status(201).json({
            message: "Blog post published successfully",
            post
        });
    } catch (err) {
        console.error("createPost error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function deletePost(req, res) {
    try {
        const postId = req.params.id;
        const userId = req.user.userId || req.user.user_id;
        const isAdmin = req.user.role === "admin";

        const deleted = await blogModel.deleteBlogPost(postId, userId, isAdmin);
        if (!deleted) {
            return res.status(403).json({ message: "You are not authorized to delete this post or post was not found" });
        }

        return res.status(200).json({ message: "Post deleted successfully" });
    } catch (err) {
        console.error("deletePost error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function getComments(req, res) {
    try {
        const postId = req.params.id;
        const comments = await blogModel.getCommentsByPost(postId);
        return res.status(200).json(comments);
    } catch (err) {
        console.error("getComments error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function addComment(req, res) {
    try {
        const postId = req.params.id;
        const userId = req.user.userId || req.user.user_id;
        const { text } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({ message: "Comment text cannot be empty" });
        }

        const comment = await blogModel.addComment(postId, userId, text.trim());
        return res.status(201).json({
            message: "Comment added",
            comment
        });
    } catch (err) {
        console.error("addComment error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function deleteComment(req, res) {
    try {
        const commentId = req.params.commentId;
        const userId = req.user.userId || req.user.user_id;
        const isAdmin = req.user.role === "admin";

        const deleted = await blogModel.deleteComment(commentId, userId, isAdmin);
        if (!deleted) {
            return res.status(403).json({ message: "Unauthorized to delete this comment" });
        }

        return res.status(200).json({ message: "Comment deleted successfully" });
    } catch (err) {
        console.error("deleteComment error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function votePost(req, res) {
    try {
        const postId = req.params.id;
        const userId = req.user.userId || req.user.user_id;
        const { type } = req.body; // 'like' or 'dislike'

        if (!['like', 'dislike'].includes(type)) {
            return res.status(400).json({ message: "Type must be 'like' or 'dislike'" });
        }

        const result = await blogModel.toggleVote(postId, userId, type);
        return res.status(200).json(result);
    } catch (err) {
        console.error("votePost error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function bookmarkPost(req, res) {
    try {
        const postId = req.params.id;
        const userId = req.user.userId || req.user.user_id;

        const result = await blogModel.toggleBookmark(postId, userId);
        return res.status(200).json(result);
    } catch (err) {
        console.error("bookmarkPost error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function getBookmarkedPosts(req, res) {
    try {
        const userId = req.user.userId || req.user.user_id;
        const posts = await blogModel.getUserBookmarkedPosts(userId);
        return res.status(200).json(posts);
    } catch (err) {
        console.error("getBookmarkedPosts error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

module.exports = {
    getPosts,
    getPostById,
    createPost,
    deletePost,
    getComments,
    addComment,
    deleteComment,
    votePost,
    bookmarkPost,
    getBookmarkedPosts
};
