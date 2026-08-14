const pool=require("../config/db");

async function getProblems(){
    console.log("Inside Problem Models");
    const result=await pool.query(
        `SELECT
            p.problem_id,
            p.title,
            p.difficulty,
            STRING_AGG(t.tag_name, ', ') AS tags
        FROM problems p
        JOIN problem_tags pt
            ON p.problem_id = pt.problem_id
        JOIN tags t
            ON pt.tag_id = t.tag_id
        GROUP BY
            p.problem_id,
            p.title,
            p.difficulty
        ORDER BY p.problem_id;
        `
    );


    return result.rows;

}



module.exports={
    getProblems


}