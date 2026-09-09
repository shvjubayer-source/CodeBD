const User=require("../models/userModel");


async function getProfile(req, res){
    try{
        const user=await User.findByUsername(req.user.username);

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

module.exports={
    getProfile
}