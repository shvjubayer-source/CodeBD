const Prob=require("../models/problemModel");


async function getProblems(req, res){
    console.log("inside problem Controller");

    try{
        const problems=await Prob.getProblems();

        if(problems.length===0){
            return res.staus(404).json({
                message: "No problems available"
            });
        }

        res.json(problems);

    }

    catch(err){

        console.error(err);
        res.staus(500).json({
            message:"Internal Server Error"
        });

    }

}


module.exports={
    getProblems


};