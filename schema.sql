
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'admin')),
    rating INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);



CREATE TABLE blog_post (
    post_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);




CREATE TABLE blog_comment (
    comment_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    text TEXT NOT NULL,

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    FOREIGN KEY (post_id)
        REFERENCES blog_post(post_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);



CREATE TABLE tags (
    tag_id SERIAL PRIMARY KEY,
    tag_name VARCHAR(50) NOT NULL UNIQUE
);



CREATE TABLE blog_tag (
    post_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,

    PRIMARY KEY (post_id, tag_id),

    FOREIGN KEY (post_id)
        REFERENCES blog_post(post_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    FOREIGN KEY (tag_id)
        REFERENCES tags(tag_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE blog_like (
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    type VARCHAR(10) NOT NULL
        CHECK (type IN ('like', 'dislike')),

    PRIMARY KEY (user_id, post_id),

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    FOREIGN KEY (post_id)
        REFERENCES blog_post(post_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);



CREATE TABLE blog_bookmarks (
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,

    PRIMARY KEY (user_id, post_id),

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    FOREIGN KEY (post_id)
        REFERENCES blog_post(post_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


-- =========================================
-- 8. PROBLEMS
-- =========================================

CREATE TABLE problems (
    problem_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    difficulty VARCHAR(20) NOT NULL
        CHECK (difficulty IN ('easy', 'medium', 'hard')),
    time_limit INTEGER NOT NULL CHECK (time_limit > 0),
    memory_limit INTEGER NOT NULL CHECK (memory_limit > 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================
-- 9. PROBLEM_TAGS
-- =========================================

CREATE TABLE problem_tags (
    problem_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,

    PRIMARY KEY (problem_id, tag_id),

    FOREIGN KEY (problem_id)
        REFERENCES problems(problem_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    FOREIGN KEY (tag_id)
        REFERENCES tags(tag_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


-- =========================================
-- 10. PROBLEM_BOOKMARKS
-- =========================================

CREATE TABLE problem_bookmarks (
    user_id INTEGER NOT NULL,
    problem_id INTEGER NOT NULL,

    PRIMARY KEY (user_id, problem_id),

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    FOREIGN KEY (problem_id)
        REFERENCES problems(problem_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


-- =========================================
-- 11. SUBMISSIONS
-- =========================================

CREATE TABLE submissions (
    submission_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    problem_id INTEGER NOT NULL,
    language VARCHAR(50) NOT NULL,
    code TEXT NOT NULL,
    verdict VARCHAR(50),
    execution_time NUMERIC(10,3),
    memory_used INTEGER,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    FOREIGN KEY (problem_id)
        REFERENCES problems(problem_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


-- =========================================
-- 12. TESTCASE
-- =========================================

CREATE TABLE testcase (
    test_id SERIAL PRIMARY KEY,
    problem_id INTEGER NOT NULL,
    input TEXT,
    expected_output TEXT NOT NULL,

    FOREIGN KEY (problem_id)
        REFERENCES problems(problem_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


-- =========================================
-- 13. SOLUTION
-- =========================================

CREATE TABLE solution (
    solution_id SERIAL PRIMARY KEY,
    problem_id INTEGER NOT NULL,
    content TEXT NOT NULL,

    FOREIGN KEY (problem_id)
        REFERENCES problems(problem_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


-- =========================================
-- 14. CONTEST
-- =========================================

CREATE TABLE contest (
    contest_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL
);


-- =========================================
-- 15. CONTEST_PROBLEM
-- =========================================

CREATE TABLE contest_problem (
    contest_id INTEGER NOT NULL,
    problem_id INTEGER NOT NULL,
    problem_order INTEGER NOT NULL,
    points INTEGER NOT NULL DEFAULT 100,

    PRIMARY KEY (contest_id, problem_id),

    FOREIGN KEY (contest_id)
        REFERENCES contest(contest_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    FOREIGN KEY (problem_id)
        REFERENCES problems(problem_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


-- =========================================
-- 16. CONTEST_PARTICIPATION
-- =========================================

CREATE TABLE contest_participation (
    user_id INTEGER NOT NULL,
    contest_id INTEGER NOT NULL,
    solve_count INTEGER NOT NULL DEFAULT 0,
    prev_rating INTEGER,
    rating_change INTEGER DEFAULT 0,
    registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, contest_id),

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    FOREIGN KEY (contest_id)
        REFERENCES contest(contest_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);