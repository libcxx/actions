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
  installRuntimes,
  getActionConfig,
  testRuntime
} = require('../src/setup-action');
const {createTestSuiteAnnotations} = require('../src/lit-utils');

// most @actions toolkit packages have async methods
async function run() {
  try {
    const test_config = core.getInput('build');
    const options = core.getInput('options');
    const action_paths = await getActionConfig();
    for (const runtime of action_paths.runtimes) {
      let xunit_path = await testRuntime(action_paths, runtime, test_config, options);
      await createTestSuiteAnnotations(xunit_path);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run()
