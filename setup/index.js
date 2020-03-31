const core = require('@actions/core');
const io = require('@actions/io');
const fs = require('fs');
const {checkoutRuntimes, configureRuntimes, buildRuntimes, createActionPaths} = require('../src/setup-action');
// most @actions toolkit packages have async methods
async function run() {
  try {
    const config_name = core.getInput('name');
    const action_paths = await createActionPaths(config_name);
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

async function cleanup(workspace) {
  try {
    if (fs.existsSync(workspace)) {
      let r = await io.rmRF(workspace);
    }
    return 0;
  } catch (error) {
    console.log('Failed during cleanup to remove ' + workspace);
  }
}

const workspace = core.getState('cleanup');
if (workspace) {
  console.log('Cleaning up workspace ' + workspace);
  cleanup(workspace);
} else {
  core.saveState('cleanup', process.env['GITHUB_WORKSPACE']);
  run()
}
