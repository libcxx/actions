
const process = require('process');
const cp = require('child_process');
var path = require('path');
const io = require('@actions/io');
const fs = require('fs');
const { checkoutRuntimes, configureRuntimes, buildRuntimes, getActionPaths, createActionPaths } = require('../src/setup-action');
const { mkdirP, run, capture, handleErrors } = require('../src/utils');

jest.setTimeout(100000);

function setup(name, workspace) {
    if (!fs.existsSync(workspace)) {
         mkdirP(workspace);
    }
    process.chdir(workspace);
    process.env['INPUT_NAME'] = name;
    process.env['INPUT_REPOSITORY'] = 'llvm/llvm-project';
    process.env['INPUT_REF'] = 'master';
    process.env['INPUT_PATH'] = 'my-out';
    process.env['INPUT_CC'] = 'clang';
    process.env['INPUT_CXX'] = 'clang++';
    process.env['INPUT_RUNTIMES'] = 'libcxx libcxxabi libunwind';
    process.env['INPUT_CXXABI'] = 'default';
    process.env['GITHUB_WORKSPACE'] = workspace;
    process.env['GITHUB_REPOSITORY'] = 'foo/bar';
    process.env['GITHUB_EVENT_PATH'] = path.join(workspace, 'payload.json');

}

function tear_down(workspace) {
    if (fs.existsSync(workspace)) {
        io.rmRF(workspace);
    }
}

beforeEach(() => {
    setup('test-run', '/tmp/test-workspace');
})

afterEach(() => {
    tear_down('/tmp/test-workspace');
})




test('test checkout paths ',  () => {
   return expect(checkoutRuntimes('my_name')).resolves.toBeDefined();
})
