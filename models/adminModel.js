const pool = require('../config/db');

const getAllUsers = async () => {
  const result = await pool.query(
    'SELECT user_id, username, email, role, rating, created_at FROM users ORDER BY created_at DESC'
  );
  return result.rows;
};

const getTotalCounts = async () => {
  const [usersResult, problemsResult, submissionsResult, contestsResult] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM users'),
    pool.query('SELECT COUNT(*) FROM problems'),
    pool.query('SELECT COUNT(*) FROM submissions'),
    pool.query('SELECT COUNT(*) FROM contest'),
  ]);

  return {
    totalUsers: parseInt(usersResult.rows[0].count, 10),
    totalProblems: parseInt(problemsResult.rows[0].count, 10),
    totalSubmissions: parseInt(submissionsResult.rows[0].count, 10),
    totalContests: parseInt(contestsResult.rows[0].count, 10),
  };
};

const updateUserRole = async (userId, role) => {
  const result = await pool.query(
    'UPDATE users SET role=$2 WHERE user_id=$1 RETURNING user_id, username, email, role',
    [userId, role]
  );
  return result.rows[0];
};

const getAllSubmissions = async () => {
  const result = await pool.query(
    `SELECT
      s.submission_id,
      s.user_id,
      u.username,
      s.problem_id,
      p.title AS problem_title,
      s.language,
      s.verdict,
      s.execution_time,
      s.memory_used,
      s.submitted_at
    FROM submissions s
    JOIN users u ON s.user_id = u.user_id
    JOIN problems p ON s.problem_id = p.problem_id
    ORDER BY s.submitted_at DESC`
  );
  return result.rows;
};

const getAllContests = async () => {
  const result = await pool.query('SELECT * FROM contest ORDER BY start_time DESC');
  return result.rows;
};

const createContest = async (title, description, start_time) => {
  const result = await pool.query(
    'INSERT INTO contest(title, description, start_time) VALUES($1, $2, $3) RETURNING *',
    [title, description, start_time]
  );
  return result.rows[0];
};

const updateContest = async (contestId, title, description, start_time) => {
  const result = await pool.query(
    'UPDATE contest SET title=$1, description=$2, start_time=$3 WHERE contest_id=$4 RETURNING *',
    [title, description, start_time, contestId]
  );
  return result.rows[0];
};

const deleteContest = async (contestId) => {
  const result = await pool.query(
    'DELETE FROM contest WHERE contest_id=$1 RETURNING *',
    [contestId]
  );
  return result.rows[0];
};

const getAllTags = async () => {
  const result = await pool.query('SELECT * FROM tags ORDER BY tag_name');
  return result.rows;
};

const createTag = async (tagName) => {
  const result = await pool.query(
    'INSERT INTO tags(tag_name) VALUES($1) ON CONFLICT(tag_name) DO NOTHING RETURNING *',
    [tagName]
  );
  return result.rows[0];
};

const deleteTag = async (tagId) => {
  const result = await pool.query(
    'DELETE FROM tags WHERE tag_id=$1 RETURNING *',
    [tagId]
  );
  return result.rows[0];
};

module.exports = {
  getAllUsers,
  getTotalCounts,
  updateUserRole,
  getAllSubmissions,
  getAllContests,
  createContest,
  updateContest,
  deleteContest,
  getAllTags,
  createTag,
  deleteTag,
};
