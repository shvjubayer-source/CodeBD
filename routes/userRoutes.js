const express=require("express");
const path = require("path");

const router=express.Router();

const userController=require("../controllers/userController");

const authenticate=require("../middlewares/authMiddleware");


router.get("/profile", authenticate, userController.getProfile);



module.exports=router;
