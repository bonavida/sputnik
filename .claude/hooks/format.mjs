// PostToolUse hook (Edit|Write): formats the edited file with the project's
// Prettier. Files outside the project (plans, scratch files) are left alone.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { text } from 'node:stream/consumers';

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const input = JSON.parse(await text(process.stdin));
const file = input.tool_input?.file_path ?? input.tool_response?.filePath;

const relative = file
  ? path.relative(projectDir, path.resolve(projectDir, file))
  : '';
const isInsideProject =
  relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);

// Best effort: a file with a syntax error mid-edit is left for typecheck and lint
try {
  if (isInsideProject) {
    execFileSync(
      process.execPath,
      [
        path.join(projectDir, 'node_modules/prettier/bin/prettier.cjs'),
        '--write',
        '--ignore-unknown',
        '--log-level=silent',
        relative,
      ],
      { cwd: projectDir }
    );
  }
} catch {
  // Not formatted; nothing else to do
}
