const core = require('@actions/core');
const io = require('@actions/io');
const fs = require('fs');
const {checkoutRuntimes, configureRuntimes, buildRuntimes} = require('../src/setup-action');
// most @actions toolkit packages have async methods
async function run() {
  try {
    const action_paths = await checkoutRuntimes();
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
  if (fs.existsSync(workspace)) {
    let r = await io.rmRF(workspace);
  }
  return 0;
}

const workspace = core.getState('cleanup');
if (workspace) {
  cleanup(workspace);
} else {
  core.setState('cleanup', process.env['GITHUB_WORKSPACE']);
  run()
}
