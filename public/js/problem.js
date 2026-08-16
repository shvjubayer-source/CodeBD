const PROBLEMS_API = "/api/problems";
const BOOKMARKS_API = "/api/bookmarks";
const TOKEN_KEY = "token";

const problemList = document.querySelector("#problemList");
const problemCount = document.querySelector("#problemCount");
const searchInput = document.querySelector('input[name="search"]');
const difficultySelect = document.querySelector('select[name="difficulty"]');
const tagFilters = document.querySelector("#tagFilters");
const clearButton = document.querySelector(".clear-button");

let allProblems = [];

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function getAuthHeaders() {
    const token = getToken();

    return {
        Accept: "application/json",
        Authorization: `Bearer ${token}`
    };
}

function splitTags(tags) {
    return tags
        ? tags.split(",").map((tag) => tag.trim()).filter(Boolean)
        : [];
}

function createProblemCard(problem) {
    const card = document.createElement("article");
    card.className = "problem-card";
    card.dataset.problemId = problem.problem_id;

    const verdict = String(problem.verdict || "")
        .trim()
        .toLowerCase();

    if (verdict === "accepted") {
        card.classList.add("is-accepted");
        card.dataset.verdict = "accepted";
        card.title = "Verdict: Accepted";
    } else if (verdict === "wrong answer" || verdict === "wa") {
        card.classList.add("is-wrong-answer");
        card.dataset.verdict = "wrong-answer";
        card.title = "Verdict: Wrong Answer";
    } else {
        card.dataset.verdict = "not-submitted";
        card.title = "No submission yet";
    }

    const mainLink = document.createElement("a");
    mainLink.className = "problem-main";
    mainLink.href = `/problems/${problem.problem_id}`;

    const number = document.createElement("span");
    number.className = "problem-number";
    number.textContent = `#${problem.problem_id}`;

    const title = document.createElement("h4");
    title.textContent = problem.title;

    const statement = document.createElement("p");
    statement.textContent = problem.statement;

    const tagRow = document.createElement("span");
    tagRow.className = "tag-row";

    splitTags(problem.tags).forEach((tag) => {
        const tagElement = document.createElement("span");
        tagElement.textContent = tag;
        tagRow.append(tagElement);
    });

    mainLink.append(number, title, statement, tagRow);

    const difficulty = document.createElement("span");
    difficulty.className = `difficulty ${problem.difficulty.toLowerCase()}`;
    difficulty.textContent = problem.difficulty;

    const bookmarkButton = document.createElement("button");
    bookmarkButton.type = "button";
    bookmarkButton.className = "bookmark-button";
    bookmarkButton.dataset.problemId = problem.problem_id;
    updateBookmarkButton(bookmarkButton, problem);

    bookmarkButton.addEventListener("click", () => {
        toggleBookmark(problem, bookmarkButton);
    });

    card.append(mainLink, difficulty, bookmarkButton);
    return card;
}

function updateBookmarkButton(button, problem) {
    button.classList.toggle("is-bookmarked", problem.is_bookmarked);
    button.setAttribute("aria-pressed", String(problem.is_bookmarked));
    button.setAttribute(
        "aria-label",
        problem.is_bookmarked
            ? `Remove ${problem.title} from bookmarks`
            : `Bookmark ${problem.title}`
    );
    button.innerHTML = problem.is_bookmarked
        ? '<span aria-hidden="true">★</span><span class="bookmark-text">Saved</span>'
        : '<span aria-hidden="true">☆</span><span class="bookmark-text">Save</span>';
}

function renderProblems(problems) {
    problemList.replaceChildren();
    problemCount.textContent = problems.length;

    if (problems.length === 0) {
        const message = document.createElement("p");
        message.className = "list-message";
        message.textContent = "No problems match your filters.";
        problemList.append(message);
        return;
    }

    const fragment = document.createDocumentFragment();
    problems.forEach((problem) => fragment.append(createProblemCard(problem)));
    problemList.append(fragment);
}

function renderTagFilters() {
    const tags = [...new Set(allProblems.flatMap((problem) => splitTags(problem.tags)))]
        .sort((a, b) => a.localeCompare(b));

    tags.forEach((tag) => {
        const label = document.createElement("label");
        const input = document.createElement("input");
        const text = document.createElement("span");

        input.type = "checkbox";
        input.name = "tag";
        input.value = tag;
        text.textContent = tag;
        label.append(input, text);
        tagFilters.append(label);
    });
}

function applyFilters() {
    const searchText = searchInput.value.trim().toLowerCase();
    const difficulty = difficultySelect.value.toLowerCase();
    const selectedTags = [...tagFilters.querySelectorAll('input[name="tag"]:checked')]
        .map((input) => input.value);

    const filteredProblems = allProblems.filter((problem) => {
        const problemTags = splitTags(problem.tags);
        const matchesSearch =
            problem.title.toLowerCase().includes(searchText) ||
            problem.statement.toLowerCase().includes(searchText);
        const matchesDifficulty =
            !difficulty || problem.difficulty.toLowerCase() === difficulty;
        const matchesTags =
            selectedTags.length === 0 ||
            selectedTags.every((tag) => problemTags.includes(tag));

        return matchesSearch && matchesDifficulty && matchesTags;
    });

    renderProblems(filteredProblems);
}

async function toggleBookmark(problem, button) {
    const token = getToken();

    if (!token) {
        window.location.href = "/login";
        return;
    }

    const wasBookmarked = problem.is_bookmarked;
    button.disabled = true;

    try {
        const response = await fetch(`${BOOKMARKS_API}/${problem.problem_id}`, {
            method: wasBookmarked ? "DELETE" : "POST",
            headers: getAuthHeaders()
        });

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem(TOKEN_KEY);
            window.location.href = "/login";
            return;
        }

        if (!response.ok) {
            throw new Error("Bookmark request failed");
        }

        problem.is_bookmarked = !wasBookmarked;
        updateBookmarkButton(button, problem);
    } catch (error) {
        console.error("Could not update bookmark:", error);
        alert("Could not update the bookmark. Please try again.");
    } finally {
        button.disabled = false;
    }
}

async function loadProblems() {
    const token = getToken();

    if (!token) {
        window.location.href = "/login";
        return;
    }

    try {
        const response = await fetch(PROBLEMS_API, {
            method: "GET",
            headers: getAuthHeaders()
        });

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem(TOKEN_KEY);
            window.location.href = "/login";
            return;
        }

        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(
                `GET ${PROBLEMS_API} returned ${response.status}: ${responseText}`
            );
        }

        const data = await response.json();
        console.log("Problems API response:", data);

        if (Array.isArray(data)) {
            allProblems = data;
        } else if (Array.isArray(data.problems)) {
            allProblems = data.problems;
        } else {
            throw new Error("The API response does not contain a problems array");
        }

        renderTagFilters();
        renderProblems(allProblems);
    } catch (error) {
        console.error("Could not load problems:", error);
        problemCount.textContent = "0";
        problemList.innerHTML = '<p class="list-message error">Could not load problems. Please refresh the page.</p>';
    }
}

searchInput.addEventListener("input", applyFilters);
difficultySelect.addEventListener("change", applyFilters);
tagFilters.addEventListener("change", applyFilters);

clearButton.addEventListener("click", () => {
    searchInput.value = "";
    difficultySelect.value = "";
    tagFilters.querySelectorAll('input[name="tag"]').forEach((input) => {
        input.checked = false;
    });
    renderProblems(allProblems);
});

loadProblems();
