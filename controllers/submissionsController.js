const User=require("../models/userModel");

async function  getUserSubmissions(req, res) {
    console.log(req.user);
    try {
        const userSubmissions=await User.getSubmissions(req.user.userId);

        res.json(userSubmissions);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message:"Internal Server Error"
        });
    }
}



module.exports={
    getUserSubmissions
}