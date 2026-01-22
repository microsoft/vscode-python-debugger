/**
 * Rewrites lockfiles to use a custom npm registry.
 *
 * Purpose
 *  - Some lockfiles contain hardcoded references to public registries.
 *  - In Azure Pipelines, we want installs and npx to consistently resolve from a
 *    configured private/custom registry feed.
 *
 * Inputs
 *  - Environment variable: NPM_CONFIG_REGISTRY (required)
 *
 * Behavior
 *  - Recursively scans the repo (excluding node_modules and .git) for:
 *      - package-lock.json
 *      - yarn.lock
 *  - Replaces URLs matching: https://registry.<something>.(com|org)/
 *    with the provided registry URL.
 */
const fs = require('fs').promises;
const path = require('path');

async function* getLockFiles(dir) {
  const files = await fs.readdir(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      if (file === 'node_modules' || file === '.git') {
        continue;
      }
      yield* getLockFiles(fullPath);
      continue;
    }

    if (file === 'yarn.lock' || file === 'package-lock.json') {
      yield fullPath;
    }
  }
}

async function rewrite(file, registry) {
  let contents = await fs.readFile(file, 'utf8');
  const re = /https:\/\/registry\.[^.]+\.(com|org)\//g;
  contents = contents.replace(re, registry);
  await fs.writeFile(file, contents);
}

async function main() {
  let registry = process.env.NPM_CONFIG_REGISTRY;
  if (!registry) {
    throw new Error('NPM_CONFIG_REGISTRY is not set');
  }

  if (!registry.endsWith('/')) {
    registry += '/';
  }

  const root = process.cwd();
  for await (const file of getLockFiles(root)) {
    await rewrite(file, registry);
    console.log('Updated node registry:', file);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
