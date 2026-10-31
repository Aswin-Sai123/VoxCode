import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import os from 'os';

const BASE_SANDBOX_DIR = path.join(os.tmpdir(), 'voxcode_sandboxes');
if (!fs.existsSync(BASE_SANDBOX_DIR)) {
    fs.mkdirSync(BASE_SANDBOX_DIR, { recursive: true });
}

// Strictly isolated environment: strips all application secrets (Mongo, JWT, Gemini, Google)
const getSafeEnv = () => ({
    PATH: process.env.PATH || '',
    TEMP: os.tmpdir(),
    TMP: os.tmpdir(),
    NODE_ENV: 'sandbox',
    ...(process.platform === 'win32' ? {
        SYSTEMROOT: process.env.SYSTEMROOT || 'C:\\Windows',
        WINDIR: process.env.WINDIR || 'C:\\Windows',
        COMSPEC: process.env.COMSPEC || 'C:\\Windows\\system32\\cmd.exe',
        PATHEXT: process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD'
    } : {
        HOME: '/tmp',
        USER: 'nobody'
    })
});

const MAX_OUTPUT_BYTES = 512 * 1024; // 512 KB maximum buffer cap

/**
 * Spawns a child process safely with stdin, timeout, isolated env, and buffer bounds
 */
const runProcess = (cmd, args, options = {}, input = '', timeoutMs = 8000) => {
    return new Promise((resolve) => {
        const startTime = Date.now();
        let stdout = '';
        let stderr = '';
        let killed = false;
        let truncated = false;

        const safeOptions = {
            ...options,
            env: getSafeEnv(),
            detached: process.platform !== 'win32'
        };

        let proc;
        try {
            proc = spawn(cmd, args, safeOptions);
        } catch (err) {
            return resolve({
                output: `Failed to spawn ${cmd}: ${err.message}`,
                hasError: true,
                executionTime: '0.00s',
                exitCode: 1
            });
        }

        const killProcessTree = () => {
            if (!proc || !proc.pid) return;
            try {
                if (process.platform === 'win32') {
                    spawn('taskkill', ['/pid', proc.pid.toString(), '/f', '/t']);
                } else {
                    // Kill process group on Unix
                    process.kill(-proc.pid, 'SIGKILL');
                }
            } catch {
                try { proc.kill('SIGKILL'); } catch {}
            }
        };

        const timer = setTimeout(() => {
            killed = true;
            killProcessTree();
            resolve({
                output: `Execution Timed Out (Limit: ${(timeoutMs / 1000).toFixed(0)} seconds exceeded)`,
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
            if (stdout.length + data.length <= MAX_OUTPUT_BYTES) {
                stdout += data.toString();
            } else if (!truncated) {
                truncated = true;
                stdout += '\n[Output truncated: maximum limit of 512KB exceeded]';
                killProcessTree();
            }
        });

        proc.stderr?.on('data', (data) => {
            if (stderr.length + data.length <= MAX_OUTPUT_BYTES) {
                stderr += data.toString();
            } else if (!truncated) {
                truncated = true;
                stderr += '\n[Error output truncated: maximum limit exceeded]';
                killProcessTree();
            }
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
                const jsFile = path.join(runDir, 'solution.js');
                // Clean wrapper: injects input without declaring conflicting top-level const fs or input variables
                const wrappedCode = `
// Sandbox environment preparation
global.__customInput = ${JSON.stringify(customInput || '')};
try {
${code}
} catch (err) {
    console.error(err.stack || err.message);
    process.exit(1);
}
`;
                fs.writeFileSync(jsFile, wrappedCode);
                return await runProcess('node', ['solution.js'], { cwd: runDir }, customInput, timeoutMs);
            }

            case 'python':
            case 'python3':
            case 'py': {
                const pyFile = path.join(runDir, 'solution.py');
                fs.writeFileSync(pyFile, code);
                const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
                return await runProcess(pyCmd, ['solution.py'], { cwd: runDir }, customInput, timeoutMs);
            }

            case 'cpp':
            case 'c++':
            case 'c': {
                const isC = language.toLowerCase() === 'c';
                const sourceFile = path.join(runDir, isC ? 'solution.c' : 'solution.cpp');
                const exeFile = process.platform === 'win32' ? path.join(runDir, 'solution.exe') : path.join(runDir, 'solution.out');
                fs.writeFileSync(sourceFile, code);

                const compiler = isC ? 'gcc' : 'g++';
                const compileRes = await runProcess(compiler, [path.basename(sourceFile), '-o', exeFile], { cwd: runDir }, '', 10000);
                if (compileRes.hasError || !fs.existsSync(exeFile)) {
                    // Fallback to g++ if gcc is missing on system
                    if (isC) {
                        const fallbackCompile = await runProcess('g++', [path.basename(sourceFile), '-o', exeFile], { cwd: runDir }, '', 10000);
                        if (!fallbackCompile.hasError && fs.existsSync(exeFile)) {
                            return await runProcess(exeFile, [], { cwd: runDir }, customInput, timeoutMs);
                        }
                    }
                    return {
                        output: `Compilation Error:\n${compileRes.output}`,
                        hasError: true,
                        executionTime: compileRes.executionTime
                    };
                }

                return await runProcess(exeFile, [], { cwd: runDir }, customInput, timeoutMs);
            }

            case 'java': {
                const classMatch = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
                const className = classMatch ? classMatch[1] : 'Solution';

                let finalCode = code;
                if (!classMatch && !code.includes('class Solution') && !code.includes('class Main')) {
                    finalCode = `public class Solution {\n${code}\n}`;
                }

                const javaFile = path.join(runDir, `${className}.java`);
                fs.writeFileSync(javaFile, finalCode);

                const compileRes = await runProcess('javac', [`${className}.java`], { cwd: runDir }, '', 10000);
                if (compileRes.hasError) {
                    return {
                        output: `Java Compilation Error:\n${compileRes.output}`,
                        hasError: true,
                        executionTime: compileRes.executionTime
                    };
                }

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

/**
 * Attempts to execute code within an isolated Docker container
 */
const tryDockerExecution = async ({ language, code, customInput = '', timeoutMs = 8000 }) => {
    return new Promise((resolve) => {
        const lang = (language || '').toLowerCase();
        let cmdArgs = [];

        switch (lang) {
            case 'javascript':
            case 'node':
            case 'js':
                cmdArgs = ['run', '--rm', '-i', '--network=none', '--memory=256m', '--cpus=1.0', 'node:20-alpine', 'node', '-e', code];
                break;
            case 'python':
            case 'python3':
            case 'py':
                cmdArgs = ['run', '--rm', '-i', '--network=none', '--memory=256m', '--cpus=1.0', 'python:3.11-alpine', 'python3', '-c', code];
                break;
            default:
                return resolve({ dockerUnavailable: true });
        }

        const startTime = Date.now();
        let stdout = '';
        let stderr = '';
        let killed = false;

        let proc;
        try {
            proc = spawn('docker', cmdArgs, { env: getSafeEnv() });
        } catch {
            return resolve({ dockerUnavailable: true });
        }

        const timer = setTimeout(() => {
            killed = true;
            try { proc.kill('SIGKILL'); } catch {}
            resolve({
                output: `Docker execution timed out (${(timeoutMs / 1000).toFixed(0)}s limit)`,
                hasError: true,
                executionTime: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
                exitCode: 124
            });
        }, timeoutMs);

        if (customInput && proc.stdin) {
            try {
                proc.stdin.write(customInput);
                proc.stdin.end();
            } catch {}
        }

        proc.stdout?.on('data', (d) => { stdout += d.toString(); });
        proc.stderr?.on('data', (d) => { stderr += d.toString(); });

        proc.on('error', () => {
            clearTimeout(timer);
            resolve({ dockerUnavailable: true });
        });

        proc.on('close', (code) => {
            clearTimeout(timer);
            if (killed) return;
            const fullErr = (stderr || '').toLowerCase();
            if (
                fullErr.includes('cannot connect to the docker daemon') ||
                fullErr.includes('failed to connect to the docker api') ||
                fullErr.includes('is the docker daemon running') ||
                fullErr.includes('error response from daemon') ||
                fullErr.includes('the system cannot find the file specified') ||
                code === 125 ||
                code === 127
            ) {
                return resolve({ dockerUnavailable: true });
            }

            const executionTime = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;
            const cleanOutput = (stdout + (stderr ? (stdout ? '\n' : '') + stderr : '')).trim();
            resolve({
                output: cleanOutput || 'Program executed successfully with no output.',
                hasError: code !== 0,
                executionTime,
                exitCode: code,
                isDocker: true
            });
        });
    });
};

/**
 * Universal code executor: attempts Docker container isolation first,
 * seamlessly falling back to local child_process sandbox execution if Docker is unavailable.
 */
export const executeCode = async (langOrConfig, code = '', customInput = '', options = {}) => {
    let language = langOrConfig;
    let actualCode = code;
    let actualInput = customInput;
    let actualOptions = options;

    if (typeof langOrConfig === 'object' && langOrConfig !== null) {
        language = langOrConfig.language;
        actualCode = langOrConfig.code;
        actualInput = langOrConfig.customInput || '';
        actualOptions = langOrConfig.options || langOrConfig;
    }

    const timeoutMs = actualOptions?.timeoutMs || 8000;

    // 1. Try Docker container execution
    try {
        const dockerRes = await tryDockerExecution({
            language,
            code: actualCode,
            customInput: actualInput,
            timeoutMs
        });
        if (dockerRes && !dockerRes.dockerUnavailable) {
            return dockerRes;
        }
    } catch {
        // Fall back cleanly on any Docker error
    }

    // 2. Fall back to local child_process sandbox
    return await executeCodeSandbox({
        language,
        code: actualCode,
        customInput: actualInput,
        timeoutMs
    });
};

