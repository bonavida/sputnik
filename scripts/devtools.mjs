// Drives a running Sputnik window through the Chrome DevTools Protocol, so a
// change can be checked in the real Electron app without touching the desktop.
//
// Start the app with a debugging port first:
//   dev:       REMOTE_DEBUGGING_PORT=9333 pnpm dev
//   packaged:  release/win-unpacked/Sputnik.exe --remote-debugging-port=9333
// Then:
//   node scripts/devtools.mjs eval "document.title"
//   node scripts/devtools.mjs eval-file check.js
//   node scripts/devtools.mjs screenshot window.png
import { readFileSync, writeFileSync } from 'node:fs';

const PORT = process.env.DEVTOOLS_PORT ?? '9333';
const [command, argument] = process.argv.slice(2);

const usage = () => {
  process.stderr.write(
    'Usage: node scripts/devtools.mjs eval <js> | eval-file <file> | screenshot <file.png>\n'
  );
  process.exit(1);
};

if (!command || !argument) usage();

const targets = await (
  await fetch(`http://127.0.0.1:${PORT}/json/list`)
).json();
const page = targets.find((target) => target.type === 'page');
if (!page)
  throw new Error(
    `No page found on port ${PORT}. Is the app running with --remote-debugging-port?`
  );

const socket = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
let nextId = 0;

socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  pending.get(message.id)?.(message);
});

const send = (method, params = {}) =>
  new Promise((resolve) => {
    nextId += 1;
    pending.set(nextId, resolve);
    socket.send(JSON.stringify({ id: nextId, method, params }));
  });

await new Promise((resolve) =>
  socket.addEventListener('open', resolve, { once: true })
);

const evaluate = async (expression) => {
  const { result } = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    // DevTools lets eval() bypass the CSP by default; checks must see what the page sees
    allowUnsafeEvalBlockedByCSP: false,
  });
  process.stdout.write(
    `${JSON.stringify(result.exceptionDetails ?? result.result?.value, null, 2)}\n`
  );
};

const commands = {
  eval: () => evaluate(argument),
  'eval-file': () => evaluate(readFileSync(argument, 'utf8')),
  screenshot: async () => {
    const { result } = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(argument, Buffer.from(result.data, 'base64'));
    process.stdout.write(`Saved ${argument}\n`);
  },
};

await (commands[command] ?? usage)();
socket.close();
