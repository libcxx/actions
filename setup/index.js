const core = require('@actions/core');
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

run()
