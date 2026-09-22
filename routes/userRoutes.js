const express=require("express");
const path = require("path");

const router=express.Router();

const userController=require("../controllers/userController");

const authenticate=require("../middlewares/authMiddleware");


router.get("/profile", authenticate, userController.getProfile);
router.get("/analytics", authenticate, userController.getUserAnalytics);
router.put("/password", authenticate, userController.changePassword);

module.exports=router;
