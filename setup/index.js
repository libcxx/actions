const core = require('@actions/core');
const io = require('@actions/io');
const artifact = require('@actions/artifact');
const glob = require('@actions/glob');
const path = require('path');
const fs = require('fs');
const {checkoutRuntimes, configureRuntimes, buildRuntimes, createActionPaths, installRuntimes, getActionPaths} = require('../src/setup-action');

const artifactClient = artifact.create();

async function globDirectory(dir) {
  const globber = await glob.create(path.join(dir, '*'),
  {followSymbolicLinks: false});
  const files = await globber.glob()
  return files;
}

async function globDirectoryRecursive(dir) {
  const globber = await glob.create(path.join(dir, '**'),
  {followSymbolicLinks: false});
  const files = await globber.glob()
  return files;
}


async function uploadArtifact(name, files, root) {
  return artifactClient.uploadArtifact(name,
    files, root, {continueOnError: true});
}

async function uploadArtifactDir(name, root) {
  const files = await globDirectoryRecursive(root);
  return uploadArtifact(name, files, root)
}

async function run() {
  try {
    const config_name = core.getInput('name');
    const action_paths = await createActionPaths(config_name);

    let sha = await checkoutRuntimes(action_paths)
    await configureRuntimes(action_paths);

    await core.startGroup('upload-cmake-cache', async () => {
      let files = await globDirectory(action_paths.build)
      console.log(files);
      let a1 = await uploadArtifact(`runtimes-${config_name}-config-${sha}`, ['./CMakeCache.txt'], action_paths.build);
      return a1;
    });


    await buildRuntimes(action_paths);
    await installRuntimes(action_paths);
    await a1;

    await core.startGroup('upload-installation', async () => {
      let a2 = await uploadArtifactDir(`runtimes-${config_name}-install-${sha}`, action_paths.install);
      return a2;
    });

  } catch (error) {
    core.setFailed(error.message);
    return;
  }
}

async function cleanup() {
  let result = await core.group('cleanup', async () => {
    const action_paths = getActionPaths(core.getInput('name'));
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
