import { spawn } from 'child_process';

export function runCommandWithWatchdog(command, options = {}) {
  let {
    inactivityMs = 120000,
    maxBuffer = 50 * 1024 * 1024,
    encoding = 'utf-8',
    cwd,
    env,
  } = options;

  return new Promise((resolve, reject) => {
    let child = spawn(command, {
      shell: true,
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = [];
    let stderr = [];
    let stdoutSize = 0;
    let stderrSize = 0;
    let settled = false;

    let fail = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (!child.killed) {
        child.kill('SIGTERM');
      }
      reject(error);
    };

    let timer = setTimeout(() => {
      fail(new Error(`Command stalled after ${inactivityMs}ms without output: ${command}`));
    }, inactivityMs);

    let kick = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        fail(new Error(`Command stalled after ${inactivityMs}ms without output: ${command}`));
      }, inactivityMs);
    };

    let appendChunk = (chunks, chunk, currentSize, streamName) => {
      let nextSize = currentSize + chunk.length;
      if (nextSize > maxBuffer) {
        fail(new Error(`Command ${streamName} exceeded maxBuffer ${maxBuffer}: ${command}`));
        return currentSize;
      }
      chunks.push(chunk);
      kick();
      return nextSize;
    };

    child.stdout.on('data', (chunk) => {
      stdoutSize = appendChunk(stdout, chunk, stdoutSize, 'stdout');
    });

    child.stderr.on('data', (chunk) => {
      stderrSize = appendChunk(stderr, chunk, stderrSize, 'stderr');
    });

    child.on('error', fail);

    child.on('close', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      let stdoutText = Buffer.concat(stdout).toString(encoding);
      let stderrText = Buffer.concat(stderr).toString(encoding);

      if (code === 0) {
        resolve(stdoutText);
        return;
      }

      reject(
        new Error(
          `Command failed with ${signal ? `signal ${signal}` : `exit code ${code}`}: ${stderrText || command}`,
        ),
      );
    });
  });
}
