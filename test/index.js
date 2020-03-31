const core = require('@actions/core');
const io = require('@actions/io');
const artifact = require('@actions/artifact');
const glob = require('@actions/glob');
const path = require('path');
const fs = require('fs');
const {
  getRuntimeList,
  checkoutRuntimes,
  configureRuntimes,
  buildRuntimes,
  createActionPaths,
  installRuntimes,
  getActionPaths,
  testRuntime
} = require('../src/setup-action');
const {create_annotations_from_xunit_results} = require('../src/lit_utils');
const xunitViewer = require('xunit-viewer');

// most @actions toolkit packages have async methods
async function run() {
  try {
    const config_name  = core.getInput('name');
    const test_config = core.getInput('build');
    const options = core.getInput('options');
    const action_paths = await getActionPaths(config_name);
    const runtimes = getRuntimeList();
    for (const runtime of runtimes) {
      let xunit_path = await testRuntime(action_paths, runtime, test_config, options);
      await create_annotations_from_xunit_results(xunit_path);
    }

    return;

    await xunitViewer({
      server: false,
      results: input,
      ignore: ['_thingy', 'invalid'],
      title: 'Xunit View Sample Tests',
      output: 'output.html'
    });
    const files = ['output.html'];
    const uploadResponse = await artifactClient.uploadArtifact(artifactName,
        files, rootDirectory, artifactOptions);

  } catch (error) {
    core.setFailed(error.message);
  }
}

run()
