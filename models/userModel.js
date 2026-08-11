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

async function getSolveCount(username){
    const result=await pool.query(


    );


    return result.rows[0];
}


module.exports={
    findUserByEmail,
    findByUsername,
    getAllUsers,
    createUser,
    getSolveCount
}