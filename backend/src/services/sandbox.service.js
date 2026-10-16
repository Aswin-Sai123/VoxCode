import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import os from 'os';

const BASE_SANDBOX_DIR = path.join(os.tmpdir(), 'voxcode_sandboxes');
if (!fs.existsSync(BASE_SANDBOX_DIR)) {
    fs.mkdirSync(BASE_SANDBOX_DIR, { recursive: true });
}

/**
 * Spawns a child process safely with stdin and timeout
 */
const runProcess = (cmd, args, options = {}, input = '', timeoutMs = 8000) => {
    return new Promise((resolve) => {
        const startTime = Date.now();
        let stdout = '';
        let stderr = '';
        let killed = false;

        let proc;
        try {
            proc = spawn(cmd, args, options);
        } catch (err) {
            return resolve({
                output: `Failed to spawn ${cmd}: ${err.message}`,
                hasError: true,
                executionTime: '0.00s',
                exitCode: 1
            });
        }

        const timer = setTimeout(() => {
            killed = true;
            try {
                proc.kill('SIGKILL');
            } catch {
                // Ignore kill errors
            }
            resolve({
                output: 'Execution Timed Out (Limit: 8 seconds exceeded)',
                hasError: true,
                executionTime: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
                exitCode: 124
            });
        }, timeoutMs);

        if (input && proc.stdin) {
            try {
                proc.stdin.write(input);
                proc.stdin.end();
            } catch {
                // Ignore stdin write error if process already exited
            }
        }

        proc.stdout?.on('data', (data) => {
            stdout += data.toString();
        });

        proc.stderr?.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('close', (code) => {
            clearTimeout(timer);
            if (killed) return;
            const executionTime = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;
            const cleanOutput = (stdout + (stderr ? (stdout ? '\n' : '') + stderr : '')).trim();
            resolve({
                output: cleanOutput || 'Program executed successfully with no output.',
                hasError: code !== 0 || (!!stderr && code !== 0),
                executionTime,
                exitCode: code
            });
        });

        proc.on('error', (err) => {
            clearTimeout(timer);
            resolve({
                output: `Process execution error: ${err.message}`,
                hasError: true,
                executionTime: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
                exitCode: 1
            });
        });
    });
};

/**
 * Execute candidate code in a temporary isolated workspace
 * @param {string} language - 'javascript', 'python', 'cpp', or 'java'
 * @param {string} code - The source code to execute
 * @param {string} customInput - Custom input to supply via stdin
 * @param {number} timeoutMs - Timeout in milliseconds (default 8000)
 */
export const executeCodeSandbox = async ({ language, code, customInput = '', timeoutMs = 8000 }) => {
    if (!code || !code.trim()) {
        return {
            output: 'Code cannot be empty',
            hasError: true,
            executionTime: '0.00s'
        };
    }

    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const runDir = path.join(BASE_SANDBOX_DIR, runId);
    fs.mkdirSync(runDir, { recursive: true });

    try {
        switch (language.toLowerCase()) {
            case 'javascript':
            case 'node':
            case 'js': {
                // Execute JavaScript using Node.js
                const jsFile = path.join(runDir, 'solution.js');
                // Wrap code with custom console wrapper to capture output or stdout
                const wrappedCode = `
                    const fs = require('fs');
                    const input = ${JSON.stringify(customInput || '')};
                    ${code}
                `;
                fs.writeFileSync(jsFile, wrappedCode);
                return await runProcess('node', ['solution.js'], { cwd: runDir }, customInput, timeoutMs);
            }

            case 'python':
            case 'python3':
            case 'py': {
                // Execute Python using python / py
                const pyFile = path.join(runDir, 'solution.py');
                fs.writeFileSync(pyFile, code);
                const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
                return await runProcess(pyCmd, ['solution.py'], { cwd: runDir }, customInput, timeoutMs);
            }

            case 'cpp':
            case 'c++':
            case 'c': {
                // Compile and execute C++ using g++
                const cppFile = path.join(runDir, 'solution.cpp');
                const exeFile = process.platform === 'win32' ? path.join(runDir, 'solution.exe') : path.join(runDir, 'solution.out');
                fs.writeFileSync(cppFile, code);

                // Compile step (10s compilation allowance)
                const compileRes = await runProcess('g++', ['solution.cpp', '-o', exeFile], { cwd: runDir }, '', 10000);
                if (compileRes.hasError || !fs.existsSync(exeFile)) {
                    return {
                        output: `Compilation Error:\n${compileRes.output}`,
                        hasError: true,
                        executionTime: compileRes.executionTime
                    };
                }

                // Run compiled binary
                return await runProcess(exeFile, [], { cwd: runDir }, customInput, timeoutMs);
            }

            case 'java': {
                // Extract public class name or default to Solution / Main
                const classMatch = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
                const className = classMatch ? classMatch[1] : 'Solution';

                let finalCode = code;
                if (!classMatch && !code.includes('class Solution') && !code.includes('class Main')) {
                    finalCode = `public class Solution {\n${code}\n}`;
                }

                const javaFile = path.join(runDir, `${className}.java`);
                fs.writeFileSync(javaFile, finalCode);

                // Compile step
                const compileRes = await runProcess('javac', [`${className}.java`], { cwd: runDir }, '', 10000);
                if (compileRes.hasError) {
                    return {
                        output: `Java Compilation Error:\n${compileRes.output}`,
                        hasError: true,
                        executionTime: compileRes.executionTime
                    };
                }

                // Run compiled bytecode in JVM
                return await runProcess('java', [className], { cwd: runDir }, customInput, timeoutMs);
            }

            default:
                return {
                    output: `Execution for '${language}' is not configured. Supported: JavaScript, Python, C++, Java.`,
                    hasError: true,
                    executionTime: '0.00s'
                };
        }
    } finally {
        // Asynchronously clean up sandbox directory
        setTimeout(() => {
            try {
                if (fs.existsSync(runDir)) {
                    fs.rmSync(runDir, { recursive: true, force: true });
                }
            } catch {
                // Ignore cleanup lock issues on Windows
            }
        }, 1000);
    }
};
