const express = require("express");
const router = express.Router();

const bookmarksController = require("../controllers/bookmarksController");
const authenticate = require("../middlewares/authMiddleware");


// Get all bookmarks for logged-in user
router.get("/", authenticate, bookmarksController.getBookmarks);

// Add bookmark
router.post("/:problemId", authenticate, bookmarksController.addBookmark);

// Remove bookmark
router.delete("/:problemId", authenticate, bookmarksController.removeBookmark);


module.exports = router;
