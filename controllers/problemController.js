const Prob=require("../models/problemModel");


async function getProblems(req, res){
    console.log("inside problem Controller");
    // console.log(userId);
    console.log(req.user);
    
    try{
        const userId = req.user.userId;
        const problems=await Prob.getProblems(userId);

        if(problems.length===0){
            return res.status(404).json({
                message: "No problems available"
            });
        }

        res.json(problems);

    }

    catch(err){

        console.error(err);
        res.status(500).json({
            message:"Internal Server Error"
        });

    }

}


async function createProblem(req, res) {
    try {
        const {
            title,
            statement,
            difficulty,
            time_limit,
            memory_limit
        } = req.body;

        if (
            !title ||
            !statement ||
            !difficulty ||
            !time_limit ||
            !memory_limit
        ) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const problem = await Prob.addProblem(
            title,
            statement,
            difficulty,
            time_limit,
            memory_limit
        );

        return res.status(201).json({
            message: "Problem created successfully",
            problem
        });

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
}


async function updateProblem(req, res) {
    try {
        const problemId = req.params.id;

        const {
            title,
            statement,
            difficulty,
            time_limit,
            memory_limit
        } = req.body;

        if (
            !title ||
            !statement ||
            !difficulty ||
            !time_limit ||
            !memory_limit
        ) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const problem = await Prob.updateProblem(
            problemId,
            title,
            statement,
            difficulty,
            time_limit,
            memory_limit
        );

        if (!problem) {
            return res.status(404).json({
                message: "Problem not found"
            });
        }

        return res.status(200).json({
            message: "Problem updated successfully",
            problem
        });

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
}



async function deleteProblem(req, res) {
    try {
        const problemId = req.params.id;

        const problem = await Prob.deleteProblem(problemId);

        if (!problem) {
            return res.status(404).json({
                message: "Problem not found"
            });
        }

        return res.status(200).json({
            message: "Problem deleted successfully",
            problem
        });

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
}



module.exports = {
    getProblems,
    createProblem,
    updateProblem,
    deleteProblem
};

