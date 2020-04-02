
const process = require('process');
const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const utils = require('../src/utils');
const dispatch = require('../src/repo-dispatch-action');
const os = require('os');

jest.setTimeout(100000);


function setup(workspace) {
    if (!fs.existsSync(workspace)) {
         utils.mkdirP(workspace);
    }
    process.chdir(workspace);
    process.env['INPUT_REPOSITORY'] = 'llvm/llvm-project';
    process.env['INPUT_REF'] = 'master';
    process.env['INPUT_RUNTIMES'] = 'libcxx libcxxabi';
    process.env['INPUT_TOKEN'] = process.env['GITHUB_TOKEN'];
    process.env['INPUT_EVENT_TYPE'] = 'test_event';
    process.env['INPUT_CLIENT_PAYLOAD'] = JSON.stringify({
        repository: 'llvm/llvm-project',
        ref: 'master',
    })
    process.env['GITHUB_WORKSPACE'] = workspace;
    process.env['GITHUB_REPOSITORY'] = 'libcxx/actions';
    process.env['GITHUB_EVENT_PATH'] = path.join(workspace, 'payload.json');

}

beforeAll(async () => {
    await setup( fs.mkdtempSync(path.join(os.tmpdir(), '/', 'libcxx-actions-test')));
})


test('basic test', async () => {
    let r = await expect(dispatch.runAction()).resolves.toBeDefined();
})
