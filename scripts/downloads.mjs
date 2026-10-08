// Download counts of every release installer on GitHub (`pnpm downloads`).
// They count downloads, not installs: bots, retries and in-app updates on
// Windows all add up.
const REPO = 'bonavida/sputnik';

const response = await fetch(
  `https://api.github.com/repos/${REPO}/releases?per_page=100`,
  { headers: { Accept: 'application/vnd.github+json' } }
);
if (!response.ok) {
  process.stderr.write(
    `GitHub answered ${response.status} ${response.statusText}\n`
  );
  process.exit(1);
}

const releases = await response.json();
const total = releases.reduce((releaseSum, { tag_name: tag, assets }) => {
  const count = assets.reduce((sum, asset) => sum + asset.download_count, 0);
  process.stdout.write(`${tag.padEnd(10)}${String(count).padStart(6)}\n`);
  assets.forEach(({ name, download_count: downloads }) =>
    process.stdout.write(`${String(downloads).padStart(16)}  ${name}\n`)
  );
  return releaseSum + count;
}, 0);
process.stdout.write(`${'Total'.padEnd(10)}${String(total).padStart(6)}\n`);
