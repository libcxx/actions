const core = require('@actions/core');
const io = require('@actions/io');
const artifact = require('@actions/artifact');
const glob = require('@actions/glob');
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const setup = require('../src/setup-action');
const utils = require('../src/utils');


async function run() {
  try {
    const artifactClient = artifact.create();

    const config_name = core.getInput('name');
    core.saveState('config_name', config_name);
    const action_paths = await setup.createActionConfig(config_name);

    let sha = await setup.checkoutRuntimes(action_paths);
    await setup.configureRuntimes(action_paths);

    let a1 = core.group('upload-cmake-cache', async () => {
      return artifactClient.uploadArtifact(
          `runtimes-${config_name}-config`, [ path.join(action_paths.build, 'CMakeCache.txt') ],
          action_paths.build);
    });

    await setup.buildRuntimes(action_paths);
    await setup.installRuntimes(action_paths);

    let a2 = await core.group('upload-installation', async () => {
      let files = await utils.globDirectoryRecursive(action_paths.install);
      return artifactClient.uploadArtifact(
          `runtimes-${config_name}-install.zip`, files,
          action_paths.install);
    });
    await Promise.all([a1, a2]);
  } catch (error) {
    core.setFailed(error);
    return;
  }
}

async function cleanup() {
  let result = await core.group('cleanup', async () => {
    try {
      const action_paths = setup.getActionConfig();
      assert(action_paths);
      assert(action_paths.source);
      assert(action_paths.output);
      if (fs.existsSync(action_paths.source)) {
        utils.rmRfIgnoreError(action_paths.source);
      }
      if (fs.existsSync(action_paths.output)) {
        utils.rmRfIgnoreError(action_paths.output);
      }
    } catch (error) { core.setFailed(error); }
  });
  return result;
}

if (core.getState('cleanup')) {
  cleanup();
} else {
  core.saveState('cleanup', '1');
  run()
}
