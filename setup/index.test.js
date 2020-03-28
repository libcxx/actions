
const process = require('process');
const cp = require('child_process');
var path = require('path');
const io = require('@actions/io');
const fs = require('fs');
const {getActionPaths, createActionPaths} = require('../src/action_paths');
const { checkoutRuntimes, configureRuntimes, buildRuntimes } = require('../src/setup-action');
const { mkdirP, run, capture } = require('../src/utils');


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


test('test checkout ', () => {
    workspace = '/tmp/t2';
    setup('test-run', workspace);
    const action_paths = checkoutRuntimes('my_name');
    console.log(action_paths);
    console.log('Cool');
    tear_down(workspace);
})

