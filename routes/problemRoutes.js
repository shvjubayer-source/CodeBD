const express=require("express");

const router=express.Router();

const problemsController=require("../controllers/problemController");
const authenticate=require("../middlewares/authMiddleware");

router.get("/", authenticate, problemsController.getProblems);



module.exports=router;

