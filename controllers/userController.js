const User=require("../models/userModel");


async function getProfile(req, res){
    try{
        const user=await User.findById(req.user.userId);

         if(!user){
            return res.status(404).json({
                message: "User not found"
            });
         }

         const solve_count=await User.getSolveCount(req.user.userId);

         res.json({
            username:user.username,
            email: user.email,
            rating: user.rating,
            created_at: user.created_at,
            solve_count: solve_count
         });
    }

    catch(err){

        console.error(err);
        res.status(500).json({
            message:"Internal Server Error"
        });

    }
}

async function getUserAnalytics(req, res) {
    try {
        const userId = req.user.userId;
        const analytics = await User.getUserAnalytics(userId);
        return res.status(200).json({
            success: true,
            data: analytics
        });
    } catch (err) {
        console.error("getUserAnalytics error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
}

module.exports = {
    getProfile,
    getUserAnalytics
};