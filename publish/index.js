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
const {createTestSuiteAnnotations} = require('../src/lit_utils');
const xunitViewer = require('xunit-viewer');

// most @actions toolkit packages have async methods
async function run() {
  try {
    const config_name  = core.getInput('name');
    const action_paths = await getActionPaths(config_name);


    return;
/*
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
    */
  } catch (error) {
    core.setFailed(error.message);
  }
}

run()
