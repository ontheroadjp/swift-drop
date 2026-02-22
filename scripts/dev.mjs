import { spawn } from 'node:child_process';

function parsePort(argv) {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if ((arg === '--port' || arg === '-p') && argv[i + 1]) {
      return argv[i + 1];
    }
    if (arg.startsWith('--port=')) {
      return arg.slice('--port='.length);
    }
    if (arg.startsWith('-p=')) {
      return arg.slice('-p='.length);
    }
  }

  for (const arg of argv) {
    if (/^\d+$/.test(arg)) {
      return arg;
    }
  }

  const envPort = process.env.npm_config_port;
  if (envPort && /^\d+$/.test(envPort)) {
    return envPort;
  }

  return '3000';
}

const extraArgs = process.argv.slice(2);
const port = parsePort(extraArgs);

const child = spawn('next', ['dev', '-p', port], {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
