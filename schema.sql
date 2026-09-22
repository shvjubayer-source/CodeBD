-- =========================================
-- CodeBD PostgreSQL Schema
-- Run this in Navicat or psql against the "codebd" database
-- =========================================


-- =========================================
-- 1. USERS
-- =========================================

CREATE TABLE users (
    user_id  SERIAL PRIMARY KEY,
    username VARCHAR(50)  NOT NULL UNIQUE,
    email    VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role     VARCHAR(20)  NOT NULL DEFAULT 'user'
                 CHECK (role IN ('user', 'admin')),
    rating   INTEGER      NOT NULL DEFAULT 0,
    created_at TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================
-- 2. TAGS  (shared by problems AND blog)
-- =========================================

CREATE TABLE tags (
    tag_id   SERIAL PRIMARY KEY,
    tag_name VARCHAR(50) NOT NULL UNIQUE
);


-- =========================================
-- 3. PROBLEMS
-- =========================================

CREATE TABLE problems (
    problem_id    SERIAL PRIMARY KEY,
    title         VARCHAR(255) NOT NULL,
    statement     TEXT         NOT NULL,          -- called "statement" in all code
    difficulty    VARCHAR(20)  NOT NULL
                      CHECK (LOWER(difficulty) IN ('easy', 'medium', 'hard')),
    time_limit    INTEGER      NOT NULL CHECK (time_limit > 0),   -- seconds
    memory_limit  INTEGER      NOT NULL CHECK (memory_limit > 0), -- MB
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================
-- 4. PROBLEM_TAGS
-- =========================================

CREATE TABLE problem_tags (
    problem_id INTEGER NOT NULL,
    tag_id     INTEGER NOT NULL,

    PRIMARY KEY (problem_id, tag_id),

    FOREIGN KEY (problem_id)
        REFERENCES problems(problem_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    FOREIGN KEY (tag_id)
        REFERENCES tags(tag_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);


-- =========================================
-- 5. BOOKMARKS  (problem bookmarks)
--    NOTE: code references table name "bookmarks"
-- =========================================

CREATE TABLE bookmarks (
    user_id    INTEGER NOT NULL,
    problem_id INTEGER NOT NULL,

    PRIMARY KEY (user_id, problem_id),

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    FOREIGN KEY (problem_id)
        REFERENCES problems(problem_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);


-- =========================================
-- 6. SUBMISSIONS
-- =========================================

CREATE TABLE submissions (
    submission_id  SERIAL PRIMARY KEY,
    user_id        INTEGER      NOT NULL,
    problem_id     INTEGER      NOT NULL,
    language       VARCHAR(50)  NOT NULL,
    code           TEXT         NOT NULL,
    verdict        VARCHAR(50),
    execution_time NUMERIC(10,3),
    memory_used    INTEGER,
    submitted_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    FOREIGN KEY (problem_id)
        REFERENCES problems(problem_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);


-- =========================================
-- 7. TESTCASE
-- =========================================

CREATE TABLE testcase (
    test_id         SERIAL PRIMARY KEY,
    problem_id      INTEGER NOT NULL,
    input           TEXT,
    expected_output TEXT    NOT NULL,

    FOREIGN KEY (problem_id)
        REFERENCES problems(problem_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);


-- =========================================
-- 8. SOLUTION  (editorial / model solution)
-- =========================================

CREATE TABLE solution (
    solution_id SERIAL PRIMARY KEY,
    problem_id  INTEGER NOT NULL,
    content     TEXT    NOT NULL,

    FOREIGN KEY (problem_id)
        REFERENCES problems(problem_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);


-- =========================================
-- 9. CONTEST
-- =========================================

CREATE TABLE contest (
    contest_id  SERIAL PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    start_time  TIMESTAMP    NOT NULL,
    end_time    TIMESTAMP
);


-- =========================================
-- 10. CONTEST_PROBLEM
-- =========================================

CREATE TABLE contest_problem (
    contest_id     INTEGER NOT NULL,
    problem_id     INTEGER NOT NULL,
    problem_order  INTEGER NOT NULL,
    problem_label  VARCHAR(5) DEFAULT NULL,     -- e.g. 'A', 'B', 'C'
    points         INTEGER NOT NULL DEFAULT 100,

    PRIMARY KEY (contest_id, problem_id),

    FOREIGN KEY (contest_id)
        REFERENCES contest(contest_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    FOREIGN KEY (problem_id)
        REFERENCES problems(problem_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);


-- =========================================
-- 11. CONTEST_PARTICIPATION
-- =========================================

CREATE TABLE contest_participation (
    user_id        INTEGER NOT NULL,
    contest_id     INTEGER NOT NULL,
    solve_count    INTEGER NOT NULL DEFAULT 0,
    score          INTEGER NOT NULL DEFAULT 0,
    penalty        INTEGER NOT NULL DEFAULT 0,
    prev_rating    INTEGER,
    rating_change  INTEGER DEFAULT 0,
    registered_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, contest_id),

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    FOREIGN KEY (contest_id)
        REFERENCES contest(contest_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);


-- =========================================
-- 12. BLOG_POST
-- =========================================

CREATE TABLE blog_post (
    post_id  SERIAL PRIMARY KEY,
    user_id  INTEGER      NOT NULL,
    title    VARCHAR(255) NOT NULL,
    content  TEXT         NOT NULL,

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);


-- =========================================
-- 13. BLOG_COMMENT
-- =========================================

CREATE TABLE blog_comment (
    comment_id SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    post_id    INTEGER NOT NULL,
    text       TEXT    NOT NULL,

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    FOREIGN KEY (post_id)
        REFERENCES blog_post(post_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);


-- =========================================
-- 14. BLOG_TAG
-- =========================================

CREATE TABLE blog_tag (
    post_id INTEGER NOT NULL,
    tag_id  INTEGER NOT NULL,

    PRIMARY KEY (post_id, tag_id),

    FOREIGN KEY (post_id)
        REFERENCES blog_post(post_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    FOREIGN KEY (tag_id)
        REFERENCES tags(tag_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);


-- =========================================
-- 15. BLOG_LIKE
-- =========================================

CREATE TABLE blog_like (
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    type    VARCHAR(10) NOT NULL
                CHECK (type IN ('like', 'dislike')),

    PRIMARY KEY (user_id, post_id),

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    FOREIGN KEY (post_id)
        REFERENCES blog_post(post_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);


-- =========================================
-- 16. BLOG_BOOKMARKS
-- =========================================

CREATE TABLE blog_bookmarks (
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,

    PRIMARY KEY (user_id, post_id),

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    FOREIGN KEY (post_id)
        REFERENCES blog_post(post_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);


-- =========================================
-- Sample seed data (optional, uncomment to use)
-- =========================================

-- INSERT INTO tags (tag_name) VALUES
-- ('Array'), ('String'), ('Dynamic Programming'),
-- ('Graph'), ('Tree'), ('Sorting'), ('Greedy'),
-- ('Math'), ('Binary Search'), ('Two Pointers');

-- INSERT INTO problems (title, statement, difficulty, time_limit, memory_limit) VALUES
-- ('Two Sum', 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.', 'easy', 1, 256),
-- ('Binary Search', 'Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums.', 'easy', 1, 256),
-- ('Maximum Subarray', 'Given an integer array nums, find the subarray with the largest sum, and return its sum.', 'medium', 2, 256),
-- ('Longest Palindromic Substring', 'Given a string s, return the longest palindromic substring in s.', 'medium', 2, 512),
-- ('Merge Sort', 'Implement the merge sort algorithm on an array of integers.', 'medium', 2, 256),
-- ('Dijkstra Shortest Path', 'Given a weighted directed graph, find the shortest path from a source node to all other nodes.', 'hard', 3, 512);