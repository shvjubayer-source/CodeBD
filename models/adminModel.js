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
  const result = await pool.query(`
    SELECT
      c.*,
      COUNT(DISTINCT cp.user_id) AS participant_count
    FROM contest c
    LEFT JOIN contest_participation cp ON c.contest_id = cp.contest_id
    GROUP BY c.contest_id
    ORDER BY c.start_time DESC
  `);
  return result.rows;
};

const getContestRegistrations = async (contestId = null) => {
  let query = `
    SELECT
      cp.contest_id,
      c.title AS contest_title,
      c.start_time AS contest_start_time,
      cp.user_id,
      u.username,
      u.email,
      u.rating,
      cp.registered_at,
      cp.solve_count,
      cp.score
    FROM contest_participation cp
    JOIN contest c ON cp.contest_id = c.contest_id
    JOIN users u ON cp.user_id = u.user_id
  `;
  const params = [];
  if (contestId) {
    query += ` WHERE cp.contest_id = $1`;
    params.push(contestId);
  }
  query += ` ORDER BY cp.registered_at DESC`;
  const result = await pool.query(query, params);
  return result.rows;
};

const createContest = async (title, description, start_time, end_time = null) => {
  const result = await pool.query(
    'INSERT INTO contest(title, description, start_time, end_time) VALUES($1, $2, $3, $4) RETURNING *',
    [title, description, start_time, end_time]
  );
  return result.rows[0];
};

const updateContest = async (contestId, title, description, start_time, end_time = null) => {
  const result = await pool.query(
    'UPDATE contest SET title=$1, description=$2, start_time=$3, end_time=$4 WHERE contest_id=$5 RETURNING *',
    [title, description, start_time, end_time, contestId]
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

const getAnalyticsData = async () => {
  const [
    regOverTime,
    problemSolves,
    verdictDist,
    langDist,
    diffDist,
    contestPart,
    userRatings,
    recentActivity
  ] = await Promise.all([
    pool.query(`
      SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS date, COUNT(*)::INT AS count
      FROM users
      GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
      ORDER BY date ASC
    `),
    pool.query(`
      SELECT
        p.problem_id,
        p.title,
        p.difficulty,
        COUNT(DISTINCT CASE WHEN s.verdict = 'Accepted' THEN s.user_id END)::INT AS solve_count,
        COUNT(s.submission_id)::INT AS total_submissions,
        ROUND(
          COUNT(s.submission_id)::NUMERIC / NULLIF(COUNT(DISTINCT CASE WHEN s.verdict = 'Accepted' THEN s.user_id END), 0),
          1
        )::FLOAT AS avg_attempts
      FROM problems p
      LEFT JOIN submissions s ON p.problem_id = s.problem_id
      GROUP BY p.problem_id, p.title, p.difficulty
      ORDER BY solve_count DESC, total_submissions DESC
    `),
    pool.query(`
      SELECT COALESCE(verdict, 'Pending') AS verdict, COUNT(*)::INT AS count
      FROM submissions
      GROUP BY verdict
      ORDER BY count DESC
    `),
    pool.query(`
      SELECT COALESCE(NULLIF(TRIM(language), ''), 'Other') AS language, COUNT(*)::INT AS count
      FROM submissions
      GROUP BY language
      ORDER BY count DESC
    `),
    pool.query(`
      SELECT difficulty, COUNT(*)::INT AS count
      FROM problems
      GROUP BY difficulty
      ORDER BY
        CASE difficulty
          WHEN 'Easy' THEN 1
          WHEN 'Medium' THEN 2
          WHEN 'Hard' THEN 3
          ELSE 4
        END
    `),
    pool.query(`
      SELECT c.contest_id, c.title, COUNT(cp.user_id)::INT AS participant_count
      FROM contest c
      LEFT JOIN contest_participation cp ON c.contest_id = cp.contest_id
      GROUP BY c.contest_id, c.title
      ORDER BY c.start_time DESC
      LIMIT 8
    `),
    pool.query(`
      SELECT
        CASE
          WHEN rating < 1000 THEN 'Newbie (<1000)'
          WHEN rating < 1400 THEN 'Pupil (1000-1399)'
          WHEN rating < 1800 THEN 'Specialist (1400-1799)'
          ELSE 'Expert (1800+)'
        END AS tier,
        COUNT(*)::INT AS count
      FROM users
      GROUP BY 1
      ORDER BY MIN(rating) ASC
    `),
    pool.query(`
      SELECT TO_CHAR(submitted_at, 'YYYY-MM-DD') AS date, COUNT(*)::INT AS count
      FROM submissions
      GROUP BY TO_CHAR(submitted_at, 'YYYY-MM-DD')
      ORDER BY date ASC
      LIMIT 30
    `)
  ]);

  return {
    registrationsOverTime: regOverTime.rows,
    problemSolveStats: problemSolves.rows,
    verdictDistribution: verdictDist.rows,
    languageDistribution: langDist.rows,
    difficultyDistribution: diffDist.rows,
    contestParticipation: contestPart.rows,
    ratingDistribution: userRatings.rows,
    dailySubmissions: recentActivity.rows
  };
};

module.exports = {
  getAllUsers,
  getTotalCounts,
  updateUserRole,
  getAllSubmissions,
  getAllContests,
  getContestRegistrations,
  createContest,
  updateContest,
  deleteContest,
  getAllTags,
  createTag,
  deleteTag,
  getAnalyticsData,
};
