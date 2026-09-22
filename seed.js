require("dotenv").config();
const bcrypt = require("bcrypt");
const pool = require("./config/db");

async function seed() {
  console.log("🌱 Starting CodeBD Database Seeding...");

  try {
    // ── 1. Clear existing data (in correct cascade order) ─────────────────────
    console.log("Cleaning old data...");
    await pool.query(`
      TRUNCATE TABLE 
        blog_bookmarks,
        blog_like,
        blog_comment,
        blog_tag,
        blog_post,
        contest_participation,
        contest_problem,
        contest,
        solution,
        testcase,
        submissions,
        bookmarks,
        problem_tags,
        problems,
        tags,
        users
      RESTART IDENTITY CASCADE;
    `);

    // ── 2. Seed Users ─────────────────────────────────────────────────────────
    console.log("Seeding users...");
    const hashedAdminPass = await bcrypt.hash("admin123", 10);
    const hashedUserPass  = await bcrypt.hash("user123", 10);

    const userRows = await pool.query(`
      INSERT INTO users (username, email, password, role, rating)
      VALUES
        ('admin',     'admin@codebd.com',     $1, 'admin', 1900),
        ('ashikul',   'ashikul@codebd.com',   $2, 'user',  1550),
        ('coder_pro', 'coder@codebd.com',     $2, 'user',  1720),
        ('tanvir',    'tanvir@codebd.com',    $2, 'user',  1420),
        ('nafis',     'nafis@codebd.com',     $2, 'user',  1380)
      RETURNING user_id, username;
    `, [hashedAdminPass, hashedUserPass]);

    const users = {};
    userRows.rows.forEach(u => users[u.username] = u.user_id);

    // ── 3. Seed Tags ──────────────────────────────────────────────────────────
    console.log("Seeding tags...");
    const tagRows = await pool.query(`
      INSERT INTO tags (tag_name)
      VALUES 
        ('Array'), 
        ('String'), 
        ('Dynamic Programming'), 
        ('Graph'), 
        ('Tree'), 
        ('Sorting'), 
        ('Greedy'), 
        ('Math'), 
        ('Binary Search'), 
        ('Two Pointers'),
        ('Recursion'),
        ('Bit Manipulation')
      RETURNING tag_id, tag_name;
    `);

    const tags = {};
    tagRows.rows.forEach(t => tags[t.tag_name] = t.tag_id);

    // ── 4. Seed Problems ──────────────────────────────────────────────────────
    console.log("Seeding problems...");
    const probRows = await pool.query(`
      INSERT INTO problems (title, statement, difficulty, time_limit, memory_limit)
      VALUES
        (
          'Two Sum',
          'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.\n\n### Example 1:\n**Input:** nums = [2,7,11,15], target = 9\n**Output:** [0,1]\n**Explanation:** Because nums[0] + nums[1] == 9, we return [0, 1].\n\n### Constraints:\n- 2 <= nums.length <= 10^4\n- -10^9 <= nums[i] <= 10^9\n- -10^9 <= target <= 10^9',
          'Easy',
          1,
          256
        ),
        (
          'Valid Palindrome',
          'A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.\n\nGiven a string s, return true if it is a palindrome, or false otherwise.\n\n### Example 1:\n**Input:** s = "A man, a plan, a canal: Panama"\n**Output:** true\n**Explanation:** "amanaplanacanalpanama" is a palindrome.\n\n### Example 2:\n**Input:** s = "race a car"\n**Output:** false\n**Explanation:** "raceacar" is not a palindrome.',
          'Easy',
          1,
          256
        ),
        (
          'Maximum Subarray',
          'Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.\n\nA subarray is a contiguous part of an array.\n\n### Example 1:\n**Input:** nums = [-2,1,-3,4,-1,2,1,-5,4]\n**Output:** 6\n**Explanation:** [4,-1,2,1] has the largest sum = 6.\n\n### Constraints:\n- 1 <= nums.length <= 10^5\n- -10^4 <= nums[i] <= 10^4',
          'Medium',
          1,
          256
        ),
        (
          'Longest Common Subsequence',
          'Given two strings text1 and text2, return the length of their longest common subsequence. If there is no common subsequence, return 0.\n\nA subsequence of a string is a new string generated from the original string with some characters (can be none) deleted without changing the relative order of the remaining characters.\n\n### Example 1:\n**Input:** text1 = "abcde", text2 = "ace"\n**Output:** 3\n**Explanation:** The longest common subsequence is "ace" and its length is 3.',
          'Medium',
          2,
          512
        ),
        (
          'Dijkstra Shortest Path',
          'Given a directed weighted graph with N vertices (numbered 1 to N) and M edges, find the shortest distance from node 1 to all other nodes.\n\nIf a vertex is unreachable from node 1, output -1 for that vertex.\n\n### Constraints:\n- 1 <= N <= 10^4\n- 1 <= M <= 10^5\n- 1 <= weight <= 10^6',
          'Hard',
          3,
          512
        ),
        (
          'N-Queens Puzzle',
          'The n-queens puzzle is the problem of placing n queens on an n x n chessboard such that no two queens attack each other.\n\nGiven an integer n, return the number of distinct solutions to the n-queens puzzle.\n\n### Example 1:\n**Input:** n = 4\n**Output:** 2\n**Explanation:** There are two distinct solutions to the 4-queens puzzle.',
          'Hard',
          2,
          256
        )
      RETURNING problem_id, title;
    `);

    const problems = {};
    probRows.rows.forEach(p => problems[p.title] = p.problem_id);

    // ── 5. Seed Problem Tags ──────────────────────────────────────────────────
    console.log("Linking problem tags...");
    const pTagMappings = [
      { prob: 'Two Sum', tags: ['Array', 'Two Pointers'] },
      { prob: 'Valid Palindrome', tags: ['String', 'Two Pointers'] },
      { prob: 'Maximum Subarray', tags: ['Array', 'Dynamic Programming'] },
      { prob: 'Longest Common Subsequence', tags: ['Dynamic Programming', 'String'] },
      { prob: 'Dijkstra Shortest Path', tags: ['Graph', 'Greedy'] },
      { prob: 'N-Queens Puzzle', tags: ['Recursion', 'Bit Manipulation'] }
    ];

    for (const mapping of pTagMappings) {
      const pid = problems[mapping.prob];
      for (const tName of mapping.tags) {
        const tid = tags[tName];
        if (pid && tid) {
          await pool.query(`
            INSERT INTO problem_tags (problem_id, tag_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING;
          `, [pid, tid]);
        }
      }
    }

    // ── 6. Seed Test Cases ────────────────────────────────────────────────────
    console.log("Seeding test cases...");
    await pool.query(`
      INSERT INTO testcase (problem_id, input, expected_output)
      VALUES
        (${problems['Two Sum']}, '4\n2 7 11 15\n9', '0 1'),
        (${problems['Two Sum']}, '3\n3 2 4\n6', '1 2'),
        (${problems['Valid Palindrome']}, 'A man, a plan, a canal: Panama', 'true'),
        (${problems['Valid Palindrome']}, 'race a car', 'false'),
        (${problems['Maximum Subarray']}, '9\n-2 1 -3 4 -1 2 1 -5 4', '6'),
        (${problems['Longest Common Subsequence']}, 'abcde ace', '3'),
        (${problems['Dijkstra Shortest Path']}, '4 4\n1 2 2\n2 3 3\n1 3 6\n3 4 1', '0 2 5 6'),
        (${problems['N-Queens Puzzle']}, '4', '2');
    `);

    // ── 7. Seed Solutions (Editorials) ─────────────────────────────────────────
    console.log("Seeding model solutions / editorials...");
    await pool.query(`
      INSERT INTO solution (problem_id, content)
      VALUES
        (
          ${problems['Two Sum']},
          'Use a hash map to store numbers and their indices in O(N) time and O(N) space.\n\n\`\`\`cpp\n#include <unordered_map>\n#include <vector>\nusing namespace std;\n\nvector<int> twoSum(vector<int>& nums, int target) {\n    unordered_map<int, int> seen;\n    for (int i = 0; i < nums.size(); ++i) {\n        int comp = target - nums[i];\n        if (seen.count(comp)) return {seen[comp], i};\n        seen[nums[i]] = i;\n    }\n    return {};\n}\n\`\`\`'
        ),
        (
          ${problems['Maximum Subarray']},
          'Kadane algorithm maintains current running sum and global maximum in O(N) time.\n\n\`\`\`cpp\nint maxSubArray(vector<int>& nums) {\n    int cur = nums[0], max_s = nums[0];\n    for (size_t i = 1; i < nums.size(); ++i) {\n        cur = max(nums[i], cur + nums[i]);\n        max_s = max(max_s, cur);\n    }\n    return max_s;\n}\n\`\`\`'
        );
    `);

    // ── 8. Seed Contests ──────────────────────────────────────────────────────
    console.log("Seeding contests...");
    const now = new Date();
    const pastStart     = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    const pastEnd       = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    const ongoingStart  = new Date(now.getTime() - 1 * 60 * 60 * 1000);      // 1 hour ago
    const ongoingEnd    = new Date(now.getTime() + 2 * 60 * 60 * 1000);      // in 2 hours
    const upcomingStart = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // in 3 days
    const upcomingEnd   = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000); // in 4 days

    const contestRows = await pool.query(`
      INSERT INTO contest (title, description, start_time, end_time)
      VALUES
        (
          'CodeBD Beginners Round #1',
          'A friendly introductory contest for competitive programming beginners in Bangladesh. Test your implementation skills on 2 fun problems!',
          $1, $2
        ),
        (
          'Weekly Contest 42 - Grand Arena',
          'Rated contest for all divisions! Tackle problems from Dynamic Programming to Graph algorithms and climb up the leaderboard.',
          $3, $4
        ),
        (
          'National Coding Championship 2026 - Qualifier',
          'The premier online qualification round for the National Collegiate Coding Championship. Top 50 coders receive onsite invitation!',
          $5, $6
        )
      RETURNING contest_id, title;
    `, [pastStart, pastEnd, ongoingStart, ongoingEnd, upcomingStart, upcomingEnd]);

    const contests = {};
    contestRows.rows.forEach(c => contests[c.title] = c.contest_id);

    // ── 9. Seed Contest Problems ──────────────────────────────────────────────
    console.log("Linking contest problems...");
    await pool.query(`
      INSERT INTO contest_problem (contest_id, problem_id, problem_order, problem_label, points)
      VALUES
        -- Past Contest
        (${contests['CodeBD Beginners Round #1']}, ${problems['Two Sum']}, 1, 'A', 100),
        (${contests['CodeBD Beginners Round #1']}, ${problems['Valid Palindrome']}, 2, 'B', 200),

        -- Ongoing Contest
        (${contests['Weekly Contest 42 - Grand Arena']}, ${problems['Maximum Subarray']}, 1, 'A', 100),
        (${contests['Weekly Contest 42 - Grand Arena']}, ${problems['Longest Common Subsequence']}, 2, 'B', 250),
        (${contests['Weekly Contest 42 - Grand Arena']}, ${problems['Dijkstra Shortest Path']}, 3, 'C', 500),

        -- Upcoming Contest
        (${contests['National Coding Championship 2026 - Qualifier']}, ${problems['Two Sum']}, 1, 'A', 100),
        (${contests['National Coding Championship 2026 - Qualifier']}, ${problems['Dijkstra Shortest Path']}, 2, 'B', 300),
        (${contests['National Coding Championship 2026 - Qualifier']}, ${problems['N-Queens Puzzle']}, 3, 'C', 500)
      ON CONFLICT DO NOTHING;
    `);

    // ── 10. Seed Contest Participation & Standings ────────────────────────────
    console.log("Seeding contest participation...");
    await pool.query(`
      INSERT INTO contest_participation 
        (user_id, contest_id, solve_count, score, penalty, prev_rating, rating_change)
      VALUES
        -- Contest 1 standings
        (${users['coder_pro']}, ${contests['CodeBD Beginners Round #1']}, 2, 300, 45, 1660, 60),
        (${users['ashikul']},   ${contests['CodeBD Beginners Round #1']}, 2, 300, 72, 1510, 40),
        (${users['tanvir']},    ${contests['CodeBD Beginners Round #1']}, 1, 100, 30, 1400, 20),
        (${users['nafis']},     ${contests['CodeBD Beginners Round #1']}, 1, 100, 58, 1390, -10),

        -- Contest 2 registrations
        (${users['ashikul']},   ${contests['Weekly Contest 42 - Grand Arena']}, 1, 100, 25, 1550, 0),
        (${users['coder_pro']}, ${contests['Weekly Contest 42 - Grand Arena']}, 2, 350, 60, 1720, 0),
        (${users['tanvir']},    ${contests['Weekly Contest 42 - Grand Arena']}, 0, 0,    0, 1420, 0);
    `);

    // ── 11. Seed Submissions ──────────────────────────────────────────────────
    console.log("Seeding submissions...");
    await pool.query(`
      INSERT INTO submissions 
        (user_id, problem_id, language, code, verdict, execution_time, memory_used, submitted_at)
      VALUES
        (
          ${users['ashikul']}, 
          ${problems['Two Sum']}, 
          'cpp', 
          '#include <iostream>\n#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nint main() {\n    // Accepted O(N) Two Sum\n    cout << "0 1" << endl;\n    return 0;\n}', 
          'Accepted', 
          0.015, 
          1420,
          NOW() - INTERVAL '2 days'
        ),
        (
          ${users['ashikul']}, 
          ${problems['Valid Palindrome']}, 
          'python', 
          's = input().lower()\nclean = [c for c in s if c.isalnum()]\nprint("true" if clean == clean[::-1] else "false")', 
          'Accepted', 
          0.038, 
          3200,
          NOW() - INTERVAL '1 day'
        ),
        (
          ${users['ashikul']}, 
          ${problems['Maximum Subarray']}, 
          'cpp', 
          '#include <iostream>\nint main() {\n    // Incorrect greedy attempt\n    return 0;\n}', 
          'Wrong Answer', 
          0.008, 
          1200,
          NOW() - INTERVAL '3 hours'
        ),
        (
          ${users['coder_pro']}, 
          ${problems['Two Sum']}, 
          'cpp', 
          '#include <iostream>\nint main() {\n    cout << "0 1" << endl;\n    return 0;\n}', 
          'Accepted', 
          0.009, 
          1180,
          NOW() - INTERVAL '2 days'
        ),
        (
          ${users['coder_pro']}, 
          ${problems['Longest Common Subsequence']}, 
          'cpp', 
          '#include <iostream>\n#include <vector>\nusing namespace std;\nint main() { cout << 3 << endl; return 0; }', 
          'Accepted', 
          0.042, 
          4600,
          NOW() - INTERVAL '50 minutes'
        ),
        (
          ${users['tanvir']}, 
          ${problems['Two Sum']}, 
          'java', 
          'public class Main { public static void main(String[] args) { System.out.println("0 1"); } }', 
          'Accepted', 
          0.095, 
          12800,
          NOW() - INTERVAL '1 day'
        ),
        (
          ${users['tanvir']}, 
          ${problems['Dijkstra Shortest Path']}, 
          'java', 
          'public class Main { public static void main(String[] args) { while(true); } }', 
          'Time Limit Exceeded', 
          3.002, 
          24500,
          NOW() - INTERVAL '2 hours'
        ),
        (
          ${users['nafis']}, 
          ${problems['Two Sum']}, 
          'python', 
          'print("0 1")', 
          'Accepted', 
          0.045, 
          3600,
          NOW() - INTERVAL '1 day'
        );
    `);

    // ── 12. Seed Bookmarks ────────────────────────────────────────────────────
    console.log("Seeding bookmarks...");
    await pool.query(`
      INSERT INTO bookmarks (user_id, problem_id)
      VALUES
        (${users['ashikul']},   ${problems['Two Sum']}),
        (${users['ashikul']},   ${problems['Maximum Subarray']}),
        (${users['ashikul']},   ${problems['Dijkstra Shortest Path']}),
        (${users['coder_pro']}, ${problems['Longest Common Subsequence']}),
        (${users['coder_pro']}, ${problems['N-Queens Puzzle']})
      ON CONFLICT DO NOTHING;
    `);

    // ── 13. Seed Blog Posts, Comments & Likes ─────────────────────────────────
    console.log("Seeding blog posts & comments...");
    const blogRows = await pool.query(`
      INSERT INTO blog_post (user_id, title, content)
      VALUES
        (
          ${users['admin']},
          'Welcome to CodeBD: Empowering Coders Across Bangladesh',
          'CodeBD is built to provide an intuitive, high-performance platform for competitive programming students and enthusiasts in Bangladesh. Practice problems, compete in weekly rounds, and track your growth!'
        ),
        (
          ${users['coder_pro']},
          'Getting Started with Dynamic Programming: 5 Essential Tips',
          'Dynamic Programming (DP) can feel overwhelming at first. The key is recognizing optimal substructure and overlapping subproblems. Always start with a simple recursion, then memoize it, and finally convert it into an iterative table.'
        )
      RETURNING post_id;
    `);

    const post1 = blogRows.rows[0].post_id;
    const post2 = blogRows.rows[1].post_id;

    await pool.query(`
      INSERT INTO blog_comment (user_id, post_id, text)
      VALUES
        (${users['ashikul']}, ${post1}, 'Awesome platform! The UI looks clean and fast.'),
        (${users['tanvir']},  ${post1}, 'Excited for the upcoming National Championship contest!'),
        (${users['nafis']},   ${post2}, 'Great tips, especially the step-by-step conversion from recursion.');

      INSERT INTO blog_like (user_id, post_id, type)
      VALUES
        (${users['ashikul']},   ${post1}, 'like'),
        (${users['coder_pro']}, ${post1}, 'like'),
        (${users['tanvir']},    ${post1}, 'like'),
        (${users['ashikul']},   ${post2}, 'like'),
        (${users['tanvir']},    ${post2}, 'like');

      INSERT INTO blog_tag (post_id, tag_id)
      VALUES
        (${post2}, ${tags['Dynamic Programming']});
    `);

    console.log("\n=======================================================");
    console.log("🎉 SUCCESS! CodeBD database filled with realistic data!");
    console.log("=======================================================");
    console.log("\nSample Accounts Ready to Login:");
    console.log("---------------------------------------------");
    console.log("  👑 Admin Account : admin@codebd.com   / admin123");
    console.log("  👤 User Account  : ashikul@codebd.com / user123");
    console.log("  👤 User Account  : coder@codebd.com   / user123");
    console.log("---------------------------------------------\n");

  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await pool.end();
  }
}

seed();
