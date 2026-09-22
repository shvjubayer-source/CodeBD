const express = require("express");
const router = express.Router();

const blogController = require("../controllers/blogController");
const authenticate = require("../middlewares/authMiddleware");

// List all posts (with optional filters)
router.get("/", authenticate, blogController.getPosts);

// User's bookmarked posts
router.get("/bookmarked", authenticate, blogController.getBookmarkedPosts);

// Single post
router.get("/:id", authenticate, blogController.getPostById);

// Create post
router.post("/", authenticate, blogController.createPost);

// Delete post
router.delete("/:id", authenticate, blogController.deletePost);

// Comments
router.get("/:id/comments", authenticate, blogController.getComments);
router.post("/:id/comments", authenticate, blogController.addComment);
router.delete("/:id/comments/:commentId", authenticate, blogController.deleteComment);

// Vote (like / dislike)
router.post("/:id/vote", authenticate, blogController.votePost);

// Bookmark
router.post("/:id/bookmark", authenticate, blogController.bookmarkPost);

module.exports = router;
