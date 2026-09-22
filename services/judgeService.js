const { exec, spawn } = require("child_process");
const fs = require("fs").promises;
const path = require("path");
const os = require("os");

const SPAWN_BUFFER_MS = 250; // Grace period for process launch overhead

/**
 * Normalizes language name from frontend inputs
 */
function normalizeLanguage(lang) {
    if (!lang) return "unknown";
    const l = lang.toLowerCase().trim();
    if (l === "cpp" || l === "c++" || l.includes("c++")) return "cpp";
    if (l === "c") return "c";
    if (l.includes("python") || l === "py") return "python";
    if (l.includes("javascript") || l === "js" || l.includes("node")) return "javascript";
    return l;
}

/**
 * Normalizes output string for fair comparison
 * - Converts \r\n to \n
 * - Trims trailing whitespace on each line
 * - Trims leading/trailing overall whitespace
 */
function normalizeOutput(str) {
    if (!str) return "";
    return str
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n")
        .map(line => line.trimEnd())
        .join("\n")
        .trim();
}

/**
 * Kills process and its child processes (cross-platform, reliable on Windows)
 */
function killProcess(proc) {
    if (!proc || !proc.pid) return;
    try {
        if (process.platform === "win32") {
            exec(`taskkill /pid ${proc.pid} /t /f`, () => {});
        } else {
            proc.kill("SIGKILL");
        }
    } catch (e) {
        // Process might already be dead
    }
}

/**
 * Evaluates a user code submission against a set of test cases
 * 
 * @param {string} language - 'cpp', 'c', 'python', 'javascript'
 * @param {string} code - source code
 * @param {Array<{input: string, expected_output: string}>} testcases
 * @param {number} timeLimitSeconds - e.g. 1, 2, 3 seconds
 * @returns {Promise<{verdict: string, executionTime: number, error?: string, failedTestcase?: number}>}
 */
async function evaluateSubmission(language, code, testcases, timeLimitSeconds = 2) {
    const lang = normalizeLanguage(language);
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "codebd-judge-"));
    const timeLimitMs = Math.max(500, (timeLimitSeconds || 2) * 1000);
    let maxExecutionTime = 0;

    try {
        let runCommand = "";
        let runArgs = [];

        // ── 1. Compilation / Preparation Phase ────────────────────────────────
        if (lang === "cpp" || lang === "c") {
            const ext = lang === "c" ? ".c" : ".cpp";
            const srcPath = path.join(tempDir, `solution${ext}`);
            const binPath = path.join(tempDir, process.platform === "win32" ? "solution.exe" : "solution");

            await fs.writeFile(srcPath, code, "utf8");

            const compiler = lang === "c" ? "gcc" : "g++";
            const compileCmd = `${compiler} -O2 -std=c++14 "${srcPath}" -o "${binPath}"`;

            try {
                await new Promise((resolve, reject) => {
                    exec(compileCmd, { timeout: 12000 }, (err, stdout, stderr) => {
                        if (err) {
                            return reject(new Error(stderr || stdout || "Compilation failed"));
                        }
                        resolve();
                    });
                });
            } catch (compileErr) {
                return {
                    verdict: "Compilation Error",
                    executionTime: 0,
                    error: compileErr.message
                };
            }

            runCommand = binPath;
            runArgs = [];

        } else if (lang === "python") {
            const srcPath = path.join(tempDir, "solution.py");
            await fs.writeFile(srcPath, code, "utf8");

            runCommand = process.platform === "win32" ? "python" : "python3";
            runArgs = [srcPath];

        } else if (lang === "javascript") {
            const srcPath = path.join(tempDir, "solution.js");
            await fs.writeFile(srcPath, code, "utf8");

            runCommand = "node";
            runArgs = [srcPath];

        } else {
            return {
                verdict: "Compilation Error",
                executionTime: 0,
                error: `Language "${language}" is not currently supported by the judge engine.`
            };
        }

        // If no test cases are registered in DB, default to Accepted if compiled
        if (!testcases || testcases.length === 0) {
            return {
                verdict: "Accepted",
                executionTime: 0
            };
        }

        // ── 2. Test Cases Execution Phase ─────────────────────────────────────
        for (let i = 0; i < testcases.length; i++) {
            const tc = testcases[i];
            const inputData = tc.input !== undefined && tc.input !== null ? String(tc.input) : "";
            const expectedOutput = tc.expected_output !== undefined && tc.expected_output !== null ? String(tc.expected_output) : "";

            const result = await runTestCase(runCommand, runArgs, inputData, timeLimitMs);

            if (result.timedOut) {
                return {
                    verdict: "Time Limit Exceeded",
                    executionTime: timeLimitMs,
                    failedTestcase: i + 1
                };
            }

            if (result.exitCode !== 0) {
                return {
                    verdict: "Runtime Error",
                    executionTime: result.executionTime,
                    failedTestcase: i + 1,
                    error: result.stderr.trim() || `Process exited with code ${result.exitCode}`
                };
            }

            const normalizedActual = normalizeOutput(result.stdout);
            const normalizedExpected = normalizeOutput(expectedOutput);

            if (normalizedActual !== normalizedExpected) {
                return {
                    verdict: "Wrong Answer",
                    executionTime: result.executionTime,
                    failedTestcase: i + 1
                };
            }

            maxExecutionTime = Math.max(maxExecutionTime, result.executionTime);
        }

        return {
            verdict: "Accepted",
            executionTime: maxExecutionTime
        };

    } finally {
        // ── 3. Cleanup Temporary Directory ────────────────────────────────────
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        } catch (cleanupErr) {
            // Ignore temp file cleanup errors
        }
    }
}

/**
 * Runs a single test case with timeout and input piping
 */
function runTestCase(command, args, input, timeoutMs) {
    return new Promise((resolve) => {
        const start = Date.now();
        let timedOut = false;
        let stdout = "";
        let stderr = "";
        let isDone = false;

        const proc = spawn(command, args, {
            stdio: ["pipe", "pipe", "pipe"],
            windowsHide: true
        });

        const timer = setTimeout(() => {
            timedOut = true;
            killProcess(proc);
        }, timeoutMs + SPAWN_BUFFER_MS);

        if (input) {
            try {
                proc.stdin.write(input);
                if (!input.endsWith("\n")) {
                    proc.stdin.write("\n");
                }
            } catch (e) {}
        }
        try {
            proc.stdin.end();
        } catch (e) {}

        proc.stdout.on("data", (chunk) => {
            stdout += chunk.toString();
        });

        proc.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
        });

        proc.on("error", (err) => {
            if (isDone) return;
            isDone = true;
            clearTimeout(timer);
            resolve({
                stdout,
                stderr: err.message,
                exitCode: 1,
                timedOut: false,
                executionTime: Date.now() - start
            });
        });

        proc.on("close", (exitCode) => {
            if (isDone) return;
            isDone = true;
            clearTimeout(timer);
            resolve({
                stdout,
                stderr,
                exitCode: exitCode !== null ? exitCode : (timedOut ? 1 : 0),
                timedOut,
                executionTime: Date.now() - start
            });
        });
    });
}

module.exports = {
    evaluateSubmission,
    normalizeOutput,
    normalizeLanguage
};
