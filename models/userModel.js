const pool=require("../config/db");


async function findUserByEmail(email) {
    const result = await pool.query(
        `SELECT * FROM users WHERE email = $1`,
        [email]
    );

    return result.rows[0];
}

async function findByUsername(username)  {
    const result = await pool.query(
        `SELECT * FROM users
        WHERE username=$1`,
        [username]
    );

    return result.rows[0];
}

async function  getAllUsers() {
    const result=await pool.query(
        `SELECT * FROM users`,
    );

    return result.rows;
}


async function createUser(username, email, password){

    const result=await pool.query(
        `INSERT INTO users (username, email, password)
        VALUES ($1, $2, $3)
        RETURNING username, email, created_at`,
        [username, email, password]

    );

    return result.rows[0];
}

async function getSolveCount(userId){
    const result=await pool.query(
        `SELECT COUNT(*) AS solve_count
        FROM submissions s
        WHERE s.user_id=$1
        AND s.verdict='Accepted'`,
        [userId]
        //if one problem has multple accepted verdict this query won't work
    );

    return Number(result.rows[0].solve_count);
}


async function getSubmissions(userId) {
    console.log("inside submissions subsmissions model");
    const result=await pool.query(
        `SELECT *, 
        (
          SELECT username
          FROM users u
          WHERE u.user_id=s.user_id
        ) as user_name,
        (
          SELECT title
          FROM problems p
          WHERE s.problem_id=p.problem_id
        ) as problem_name
        FROM submissions s
        WHERE s.user_id=$1`,
        [userId]
    );

    console.log(result.rows);

    return result.rows;
}




module.exports={
    findUserByEmail,
    findByUsername,
    getAllUsers,
    createUser,
    getSolveCount,
    getSubmissions
}