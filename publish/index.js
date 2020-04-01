const core = require('@actions/core');
const {createAndPublishTestSuiteResults} = require('../src/publish-action');
const { getActionConfig } = require('../src/setup-action');

// most @actions toolkit packages have async methods
async function run() {
  try {
    const action_paths = getActionConfig();
    const token = core.getInput('publisher_key');
    const test_config_name = core.getInput('config_name');
    await createAndPublishTestSuiteResults(action_paths, test_config_name, token);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run()
