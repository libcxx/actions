const core = require('@actions/core');
const io = require('@actions/io');
const fs = require('fs');
const {checkoutRuntimes, configureRuntimes, buildRuntimes, createActionPaths} = require('../src/setup-action');
// most @actions toolkit packages have async methods
async function run() {
  try {
    const config_name = core.getInput('name');
    const action_paths = await createActionPaths(config_name);
    //core.saveState('action_paths', action_paths);
    await checkoutRuntimes(action_paths)
    await configureRuntimes(action_paths);
    await buildRuntimes(action_paths);
  } catch (error) {
    core.setFailed(error.message);
    return;
  }
   //const input = core.getInput('xunit_path');
    //create_annotations_for_results(input);


    //const files = ['output.html'];
    //const uploadResponse = await artifactClient.uploadArtifact(artifactName,
    //    files, rootDirectory, artifactOptions);
}

async function cleanup() {
 // const action_paths = core.getState('action_paths');
}

if (core.getState('cleanup')) {
  cleanup();
} else {
  core.saveState('cleanup', '1');
  run()
}
