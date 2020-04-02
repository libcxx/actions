const core = require('@actions/core');
const dispatch = require('../src/repo-dispatch-action');

// most @actions toolkit packages have async methods
async function run() {
  try {
    let r = await dispatch.runAction();
    return r;
  } catch (error) {
    core.setFailed(error.message);
  }
}

run()
