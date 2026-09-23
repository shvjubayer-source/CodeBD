const User=require("../models/userModel");


async function getProfile(req, res){
    try{
        const user=await User.findById(req.user.userId);

         if(!user){
            return res.status(404).json({
                message: "User not found"
            });
         }

         const [solve_count, diffStats] = await Promise.all([
             User.getSolveCount(req.user.userId),
             User.getDifficultyStats(req.user.userId)
         ]);

         res.json({
            username: user.username,
            email: user.email,
            rating: user.rating,
            tier: user.tier,
            created_at: user.created_at,
            solve_count: solve_count,
            difficulty_index: diffStats.difficultyIndex,
            difficulty_descriptor: diffStats.descriptor,
            difficulty_stats: diffStats
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

const bcrypt = require("bcrypt");

async function changePassword(req, res) {
    try {
        const userId = req.user.userId || req.user.user_id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Current password and new password are required" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters long" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Current password is incorrect" });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await User.updatePassword(userId, hashed);

        return res.status(200).json({ message: "Password updated successfully" });
    } catch (err) {
        console.error("changePassword error:", err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

module.exports = {
    getProfile,
    getUserAnalytics,
    changePassword
};