const express = require("express");
const router=express.Router();

const bookmarksController = require("../controllers/bookmarksController");
const authenticate = require("../middlewares/authMiddleware");



router.post(
    "/:problemId",
   authenticate,
    bookmarksController.addBookmark
);

router.delete(
    "/:problemId",
    authenticate,
    bookmarksController.removeBookmark
);

module.exports = router;






