const core = require('@actions/core');
const io = require('@actions/io');
const artifact = require('@actions/artifact');
const glob = require('@actions/glob');
const path = require('path');
const fs = require('fs');
const {
  checkoutRuntimes,
  configureRuntimes,
  buildRuntimes,
  createActionPaths,
  installRuntimes,
  getActionPaths
} = require('../src/setup-action');

async function globDirectory(dir) {
  const globber =
      await glob.create(path.join(dir, '*'), {followSymbolicLinks : false});
  const files = await globber.glob()
  return files;
}

async function globDirectoryRecursive(dir) {
  const globber =
      await glob.create(path.join(dir, '**'), {followSymbolicLinks : false});
  const files = await globber.glob()
  return files;
}

async function run() {
  try {
    const artifactClient = artifact.create();

    const config_name = core.getInput('name');
    const action_paths = await createActionPaths(config_name);

    let sha = await checkoutRuntimes(action_paths);
    await configureRuntimes(action_paths);

    let a1 = core.group('upload-cmake-cache', async () => {
      return artifactClient.uploadArtifact(
          `runtimes-${config_name}-config`, [ path.join(action_paths.build, 'CMakeCache.txt') ],
          action_paths.build);
    });

    await buildRuntimes(action_paths);
    await installRuntimes(action_paths);

    let a2 = await core.group('upload-installation', async () => {
      let files = await globDirectoryRecursive(action_paths.install);
      return artifactClient.uploadArtifact(
          `runtimes-${config_name}-install.zip`, files,
          action_paths.install);
    });
    await a1;
    await a2;
  } catch (error) {
    core.setFailed(error.message);
    return;
  }
}

async function cleanup() {
  let result = await core.group('cleanup', async () => {

    const action_paths = getActionPaths();
    if (fs.existsSync(action_paths.source)) {
      await io.rmRF(action_paths.source);
    }
    if (fs.existsSync(action_paths.output)) {
      await io.rmRF(action_paths.output);
    }
  });
  return result;
}

if (core.getState('cleanup')) {
  cleanup();
} else {
  core.saveState('cleanup', '1');
  run()
}
