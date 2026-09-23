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
-- 17. SHADOW TABLE: USER_AUDIT_LOG
-- =========================================

CREATE TABLE IF NOT EXISTS user_audit_log (
    audit_id    SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL,
    old_role    VARCHAR(20),
    new_role    VARCHAR(20),
    old_rating  INTEGER,
    new_rating  INTEGER,
    action_type VARCHAR(50) NOT NULL,
    changed_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================
-- 18. TRIGGER: USER ROLE & RATING AUDIT (SHADOW LOGGING)
-- =========================================

CREATE OR REPLACE FUNCTION trg_user_audit_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.role IS DISTINCT FROM NEW.role) OR (OLD.rating IS DISTINCT FROM NEW.rating) THEN
        INSERT INTO user_audit_log (
            user_id,
            old_role,
            new_role,
            old_rating,
            new_rating,
            action_type,
            changed_at
        )
        VALUES (
            NEW.user_id,
            OLD.role,
            NEW.role,
            OLD.rating,
            NEW.rating,
            CASE 
                WHEN OLD.role IS DISTINCT FROM NEW.role AND OLD.rating IS DISTINCT FROM NEW.rating THEN 'ROLE_AND_RATING_CHANGE'
                WHEN OLD.role IS DISTINCT FROM NEW.role THEN 'ROLE_CHANGE'
                ELSE 'RATING_CHANGE'
            END,
            CURRENT_TIMESTAMP
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_audit ON users;
CREATE TRIGGER trg_user_audit
AFTER UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION trg_user_audit_func();


-- =========================================
-- 19. TRIGGER: CONTEST PARTICIPATION VALIDATION
-- Validates that a contest has not already concluded before allowing registration.
-- =========================================

CREATE OR REPLACE FUNCTION trg_check_contest_active_func()
RETURNS TRIGGER AS $$
DECLARE
    v_end_time TIMESTAMP;
BEGIN
    SELECT end_time INTO v_end_time
    FROM contest
    WHERE contest_id = NEW.contest_id;

    IF v_end_time IS NOT NULL AND CURRENT_TIMESTAMP > v_end_time THEN
        RAISE EXCEPTION 'Cannot register for contest ID %: contest has already ended at %', NEW.contest_id, v_end_time;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_contest_active ON contest_participation;
CREATE TRIGGER trg_check_contest_active
BEFORE INSERT ON contest_participation
FOR EACH ROW
EXECUTE FUNCTION trg_check_contest_active_func();


-- =========================================
-- 20. FUNCTION: PROBLEM ACCEPTANCE RATE
-- Calculates the acceptance percentage for a given problem.
-- =========================================

CREATE OR REPLACE FUNCTION fn_get_problem_acceptance_rate(p_problem_id INTEGER)
RETURNS NUMERIC(5,2) AS $$
DECLARE
    v_total_subs INTEGER;
    v_ac_subs INTEGER;
    v_rate NUMERIC(5,2);
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE verdict = 'Accepted')
    INTO v_total_subs, v_ac_subs
    FROM submissions
    WHERE problem_id = p_problem_id;

    IF v_total_subs = 0 THEN
        RETURN 0.00;
    END IF;

    v_rate := ROUND((v_ac_subs::NUMERIC / v_total_subs::NUMERIC) * 100.0, 2);
    RETURN v_rate;
END;
$$ LANGUAGE plpgsql;


-- =========================================
-- 21. FUNCTION: USER RATING TIER
-- Returns competitive programming tier name based on rating.
-- =========================================

CREATE OR REPLACE FUNCTION fn_get_user_rating_tier(p_user_id INTEGER)
RETURNS VARCHAR(50) AS $$
DECLARE
    v_rating INTEGER;
BEGIN
    SELECT rating INTO v_rating FROM users WHERE user_id = p_user_id;

    IF v_rating IS NULL THEN
        RETURN 'Unknown';
    ELSIF v_rating < 1000 THEN
        RETURN 'Newbie (<1000)';
    ELSIF v_rating < 1400 THEN
        RETURN 'Pupil (1000-1399)';
    ELSIF v_rating < 1800 THEN
        RETURN 'Specialist (1400-1799)';
    ELSE
        RETURN 'Expert (1800+)';
    END IF;
END;
$$ LANGUAGE plpgsql;


-- =========================================
-- 22. STORED PROCEDURE: MULTI-STEP CONTEST REGISTRATION
-- Handles multi-step workflow: verifies user & contest, captures current rating,
-- and registers participant record within a single transactional procedure.
-- =========================================

CREATE OR REPLACE PROCEDURE sp_register_contest_participant(
    p_user_id INTEGER,
    p_contest_id INTEGER
)
AS $$
DECLARE
    v_user_rating INTEGER;
    v_contest_exists BOOLEAN;
BEGIN
    -- Check contest existence
    SELECT EXISTS(SELECT 1 FROM contest WHERE contest_id = p_contest_id) INTO v_contest_exists;
    IF NOT v_contest_exists THEN
        RAISE EXCEPTION 'Contest with ID % does not exist', p_contest_id;
    END IF;

    -- Fetch user current rating to freeze as prev_rating
    SELECT rating INTO v_user_rating FROM users WHERE user_id = p_user_id;
    IF v_user_rating IS NULL THEN
        RAISE EXCEPTION 'User with ID % does not exist', p_user_id;
    END IF;

    -- Insert participation record
    INSERT INTO contest_participation (
        user_id,
        contest_id,
        solve_count,
        score,
        penalty,
        prev_rating,
        rating_change,
        registered_at
    )
    VALUES (
        p_user_id,
        p_contest_id,
        0,
        0,
        0,
        v_user_rating,
        0,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (user_id, contest_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;