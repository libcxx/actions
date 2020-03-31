const core = require('@actions/core');
const io = require('@actions/io');
const artifact = require('@actions/artifact');
const glob = require('@actions/glob');
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const {
  checkoutRuntimes,
  configureRuntimes,
  buildRuntimes,
  createActionPaths,
  installRuntimes,
  getActionPaths
} = require('../src/setup-action');
const {
  rmRfIgnoreError,
  globDirectoryRecursive
} = require('../src/utils');


async function run() {
  try {
    const artifactClient = artifact.create();

    const config_name = core.getInput('name');
    core.saveState('config_name', config_name);
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
    try {
      const action_paths = getActionPaths(core.getState('config_name'));
      assert(action_paths);
      assert(action_paths.source);
      assert(action_paths.output);
      if (fs.existsSync(action_paths.source)) {
        rmRfIgnoreError(action_paths.source);
      }
      if (fs.existsSync(action_paths.output)) {
        rmRfIgnoreError(action_paths.output);
      }
    } catch (error) { core.setFailed(error.message); }
  });
  return result;
}

if (core.getState('cleanup')) {
  cleanup();
} else {
  core.saveState('cleanup', '1');
  run()
}
