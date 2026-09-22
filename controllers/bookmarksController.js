const bookmarksModel = require("../models/bookmarksModel");

async function getBookmarks(req, res) {
    try {
        const userId = req.user.userId;
        const bookmarks = await bookmarksModel.getBookmarks(userId);

        return res.status(200).json(bookmarks);
    } catch (error) {
        console.error("Error fetching bookmarks:", error);
        return res.status(500).json({ message: "Failed to fetch bookmarks" });
    }
}

async function addBookmark(req, res) {
    try {
        const userId = req.user.userId;
        const problemId = Number(req.params.problemId);

        if (!Number.isInteger(problemId) || problemId <= 0) {
            return res.status(400).json({ message: "Invalid problem ID" });
        }

        const bookmark = await bookmarksModel.addBookmark(userId, problemId);

        if (!bookmark) {
            return res.status(200).json({
                message: "Problem is already bookmarked",
                is_bookmarked: true
            });
        }

        return res.status(201).json({
            message: "Problem bookmarked successfully",
            is_bookmarked: true,
            bookmark
        });
    } catch (error) {
        console.error("Error adding bookmark:", error);

        if (error.code === "23503") {
            return res.status(404).json({ message: "Problem not found" });
        }

        return res.status(500).json({ message: "Failed to bookmark problem" });
    }
}

async function removeBookmark(req, res) {
    try {
        const userId = req.user.userId;
        const problemId = Number(req.params.problemId);

        if (!Number.isInteger(problemId) || problemId <= 0) {
            return res.status(400).json({ message: "Invalid problem ID" });
        }

        const removedBookmark = await bookmarksModel.removeBookmark(userId, problemId);

        if (!removedBookmark) {
            return res.status(404).json({
                message: "Bookmark not found",
                is_bookmarked: false
            });
        }

        return res.status(200).json({
            message: "Bookmark removed successfully",
            is_bookmarked: false
        });
    } catch (error) {
        console.error("Error removing bookmark:", error);
        return res.status(500).json({ message: "Failed to remove bookmark" });
    }
}

module.exports = {
    getBookmarks,
    addBookmark,
    removeBookmark
};