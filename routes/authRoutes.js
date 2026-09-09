const express=require("express");
const path = require("path");

const router=express.Router();


const authController=require("../controllers/authController");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);





module.exports=router;
