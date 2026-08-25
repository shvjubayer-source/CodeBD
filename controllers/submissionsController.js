const User=require("../models/userModel");

async function  getUserSubmissions(req, res) {
    console.log(req.user);
    try {
        const userSubmissions=await User.getSubmissions(req.user.userId);

        res.json(userSubmissions);

    } catch (error) {
        console.error(err);
        console.log("inside submission controller");
        res.staus(500).json({
            message:"Internal Server Error"
        });
    }
}



module.exports={
    getUserSubmissions
}