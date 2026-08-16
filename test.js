require("dotenv").config();

const Prob = require("./models/problemModel");

async function testGetProblems() {
    try {
        const problems = await Prob.getProblems(8);
        console.log(problems);
    } catch (error) {
        console.error("Test failed:", error);
    }
}

testGetProblems();