const core = require('@actions/core');
const io = require('@actions/io');
const artifact = require('@actions/artifact');
const glob = require('@actions/glob');
const fs = require('fs');
const {checkoutRuntimes, configureRuntimes, buildRuntimes, createActionPaths, installRuntimes} = require('../src/setup-action');
// most @actions toolkit packages have async methods

function uploadConfigurationArtifacts(action_paths, artifactClient) {
   const artifactOptions = {
      continueOnError: true
    }
    artifactClient.uploadArtifact('CMake Cache', ['CMakeCache.txt'],
                                   action_paths.build, artifactOptions);
}

async function uploadInstallationArtifacts(action_paths, artifactClient) {
   const artifactOptions = {
      continueOnError: true,
    }
    const globber = await glob.create(path.join(action_paths.install, '**'), {
    followSymbolicLinks: false});
    const files = await globber.glob()
    console.log(files)
    artifactClient.uploadArtifact('Installation', files,
                                   action_paths.install, artifactOptions);
}

async function run() {
  try {
    const artifactClient = artifact.create();

    const config_name = core.getInput('name');
    const action_paths = await createActionPaths(config_name);

    await checkoutRuntimes(action_paths)
    await configureRuntimes(action_paths);
    uploadConfigurationArtifacts(action_paths, artifactClient);

    await buildRuntimes(action_paths);
    await installRuntimes(action_paths);
    uploadInstallationArtifacts(action_paths, artifactClient);

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
