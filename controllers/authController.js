const jwt=require("jsonwebtoken");
const bcrypt=require("bcrypt");
const User=require("../models/userModel");



async function register(req, res) {
    try{

        const {username, email, password} = req.body;

        if(!username || !email || !password){

            res.status(400).json({
                message:"All fields are require"
            });

        }



        const existingUserName=await User.findByUsername(username);

        if(existingUserName){
            return res.status(409).json({
                message: "Username already exists"
            })
        }

        const existingEmail=await User.findUserByEmail(email);

        if(existingEmail){
            return res.status(409).json({
                message: "Email already exists"
            })
        }

        const hashedPass=await bcrypt.hash(password, 10);

        const new_user=await User.createUser(username, email, hashedPass);

        res.status(201).json({
            message: "User registered successfully",
            new_user
        });





    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Server error"
        });
    }


}



async function login(req, res) {
    try{

        const {email, password}=req.body;

        if(!email || !password){

            return res.status(400).json({
                message: "Email and Password Required"
            });
        }

        const user=await User.findUserByEmail(email);

        if(!user){
            return res.status(401).json({
                message: "Invalid email"
            });
        }

        const isMatches=await bcrypt.compare(password, user.password);

        if(!isMatches){
            return res.status(401).json({
                message: "Invalid password"
            });
        }

        const token=jwt.sign(
            {
                userId:user.user_id,
                username:user.username
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        res.json({
            message: "Login successful",
            token: token
        });



    }catch(err){
        console.log(err);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
}



module.exports={
    register,
    login
}