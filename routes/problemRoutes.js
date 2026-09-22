const express = require("express");
const router = express.Router();

const problemsController = require("../controllers/problemController");
const authenticate = require("../middlewares/authMiddleware");
const authorizeRole = require("../middlewares/roleMiddleware");


// Get all problems (authenticated users)
router.get("/", authenticate, problemsController.getProblems);

// Get single problem by ID (authenticated users)
router.get("/:id", authenticate, problemsController.getProblemById);


// Create problem — admin only
router.post(
    "/",
    authenticate,
    authorizeRole("admin"),
    problemsController.createProblem
);

// Update problem — admin only
router.put(
    "/:id",
    authenticate,
    authorizeRole("admin"),
    problemsController.updateProblem
);

// Delete problem — admin only
router.delete(
    "/:id",
    authenticate,
    authorizeRole("admin"),
    problemsController.deleteProblem
);


module.exports = router;